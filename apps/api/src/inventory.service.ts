import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type {
  InventoryQuery,
  MovementQuery,
  TransferQuery,
  StockOperationResponse,
  StockTransferResponse,
  InventoryBalanceView,
  StockMovementView,
  StockTransferView,
  CatalogPage,
} from '@inventario/types';
import type {
  stockOperationSchema,
  stockAdjustmentSchema,
  stockTransferSchema,
} from '@inventario/validation';
import { DatabaseService } from './database.service';

type OperationInput = z.output<typeof stockOperationSchema>;
type AdjustmentInput = z.output<typeof stockAdjustmentSchema>;
type TransferInput = z.output<typeof stockTransferSchema>;
type Tx = Prisma.TransactionClient;

const balanceInclude = {
  product: { select: { id: true, name: true, sku: true, minStock: true } },
  warehouse: { select: { id: true, name: true } },
} satisfies Prisma.InventoryBalanceInclude;
type BalanceRow = Prisma.InventoryBalanceGetPayload<{
  include: typeof balanceInclude;
}>;

function balanceView(row: BalanceRow): InventoryBalanceView {
  return {
    id: row.id,
    productId: row.productId,
    warehouseId: row.warehouseId,
    quantity: row.quantity.toString(),
    product: {
      id: row.product.id,
      name: row.product.name,
      sku: row.product.sku,
      minStock: row.product.minStock?.toString() ?? null,
    },
    warehouse: row.warehouse,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function movementView(row: {
  id: string;
  productId: string;
  warehouseId: string;
  transferId: string | null;
  type: StockMovementView['type'];
  direction: StockMovementView['direction'];
  quantity: Prisma.Decimal;
  reason: string | null;
  createdByUserId: string;
  createdAt: Date;
}): StockMovementView {
  return {
    id: row.id,
    productId: row.productId,
    warehouseId: row.warehouseId,
    transferId: row.transferId,
    type: row.type,
    direction: row.direction,
    quantity: row.quantity.toString(),
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function transferView(row: {
  id: string;
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: Prisma.Decimal;
  status: 'COMPLETED';
  reason: string | null;
  createdByUserId: string;
  createdAt: Date;
  completedAt: Date;
}): StockTransferView {
  return {
    id: row.id,
    productId: row.productId,
    fromWarehouseId: row.fromWarehouseId,
    toWarehouseId: row.toWarehouseId,
    quantity: row.quantity.toString(),
    status: row.status,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt.toISOString(),
  };
}

function pagination(query: { page?: number; pageSize?: number }) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  private async requireActiveCatalog(
    tx: Tx,
    tenantId: string,
    productId: string,
    warehouseIds: string[],
  ) {
    const [product, warehouses] = await Promise.all([
      tx.product.findFirst({
        where: { id: productId, tenantId, status: 'ACTIVE' },
        select: { id: true },
      }),
      tx.warehouse.findMany({
        where: {
          id: { in: warehouseIds },
          tenantId,
          status: 'ACTIVE',
          branch: { status: 'ACTIVE', company: { status: 'ACTIVE' } },
        },
        select: { id: true },
      }),
    ]);
    if (!product || warehouses.length !== new Set(warehouseIds).size)
      throw new NotFoundException('Product or warehouse not found');
  }

  private balanceKey(tenantId: string, warehouseId: string, productId: string) {
    return {
      tenantId_warehouseId_productId: { tenantId, warehouseId, productId },
    };
  }

  private async increase(
    tx: Tx,
    tenantId: string,
    warehouseId: string,
    productId: string,
    quantity: string,
  ) {
    await tx.inventoryBalance.upsert({
      where: this.balanceKey(tenantId, warehouseId, productId),
      create: { tenantId, warehouseId, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
  }

  private async decrease(
    tx: Tx,
    tenantId: string,
    warehouseId: string,
    productId: string,
    quantity: string,
  ) {
    const updated = await tx.inventoryBalance.updateMany({
      where: { tenantId, warehouseId, productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (updated.count !== 1) throw new ConflictException('Insufficient stock');
  }

  private async currentBalance(
    tx: Tx,
    tenantId: string,
    warehouseId: string,
    productId: string,
  ) {
    return balanceView(
      await tx.inventoryBalance.findUniqueOrThrow({
        where: this.balanceKey(tenantId, warehouseId, productId),
        include: balanceInclude,
      }),
    );
  }

  private async operate(
    tenantId: string,
    actor: string,
    input: OperationInput,
    type: StockMovementView['type'],
    direction: StockMovementView['direction'],
    auditAction?: string,
  ): Promise<StockOperationResponse> {
    try {
      return await this.database.client.$transaction(async (tx) => {
        await this.requireActiveCatalog(tx, tenantId, input.productId, [
          input.warehouseId,
        ]);
        if (type === 'INITIAL') {
          await tx.inventoryBalance.create({
            data: {
              tenantId,
              warehouseId: input.warehouseId,
              productId: input.productId,
              quantity: input.quantity,
            },
          });
        } else if (direction === 'IN') {
          await this.increase(
            tx,
            tenantId,
            input.warehouseId,
            input.productId,
            input.quantity,
          );
        } else {
          await this.decrease(
            tx,
            tenantId,
            input.warehouseId,
            input.productId,
            input.quantity,
          );
        }
        const movement = await tx.stockMovement.create({
          data: {
            tenantId,
            productId: input.productId,
            warehouseId: input.warehouseId,
            quantity: input.quantity,
            type,
            direction,
            reason: input.reason,
            createdByUserId: actor,
          },
        });
        if (auditAction)
          await tx.auditLog.create({
            data: {
              tenantId,
              actorUserId: actor,
              action: auditAction,
              entityId: movement.id,
            },
          });
        const balance = await this.currentBalance(
          tx,
          tenantId,
          input.warehouseId,
          input.productId,
        );
        return { balance, movement: movementView(movement) };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Initial stock or balance already exists');
      throw error;
    }
  }

  initial(tenantId: string, actor: string, input: OperationInput) {
    return this.operate(
      tenantId,
      actor,
      input,
      'INITIAL',
      'IN',
      'INITIAL_STOCK_RECORDED',
    );
  }
  entry(tenantId: string, actor: string, input: OperationInput) {
    return this.operate(tenantId, actor, input, 'ENTRY', 'IN');
  }
  issue(tenantId: string, actor: string, input: OperationInput) {
    return this.operate(tenantId, actor, input, 'ISSUE', 'OUT');
  }
  adjustment(tenantId: string, actor: string, input: AdjustmentInput) {
    return this.operate(
      tenantId,
      actor,
      input,
      'ADJUSTMENT',
      input.direction,
      'STOCK_ADJUSTED',
    );
  }

  async transfer(
    tenantId: string,
    actor: string,
    input: TransferInput,
  ): Promise<StockTransferResponse> {
    if (input.fromWarehouseId === input.toWarehouseId)
      throw new BadRequestException('Warehouses must differ');
    return this.database.client.$transaction(async (tx) => {
      await this.requireActiveCatalog(tx, tenantId, input.productId, [
        input.fromWarehouseId,
        input.toWarehouseId,
      ]);
      // Lock existing balances in a stable order so opposite transfers cannot deadlock.
      for (const warehouseId of [
        input.fromWarehouseId,
        input.toWarehouseId,
      ].sort()) {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "InventoryBalance" WHERE "tenantId" = ${tenantId}::uuid AND "warehouseId" = ${warehouseId}::uuid AND "productId" = ${input.productId}::uuid FOR UPDATE`,
        );
      }
      const transfer = await tx.stockTransfer.create({
        data: {
          tenantId,
          productId: input.productId,
          fromWarehouseId: input.fromWarehouseId,
          toWarehouseId: input.toWarehouseId,
          quantity: input.quantity,
          reason: input.reason,
          createdByUserId: actor,
        },
      });
      await this.decrease(
        tx,
        tenantId,
        input.fromWarehouseId,
        input.productId,
        input.quantity,
      );
      await this.increase(
        tx,
        tenantId,
        input.toWarehouseId,
        input.productId,
        input.quantity,
      );
      const outgoing = await tx.stockMovement.create({
        data: {
          tenantId,
          productId: input.productId,
          warehouseId: input.fromWarehouseId,
          transferId: transfer.id,
          quantity: input.quantity,
          type: 'TRANSFER',
          direction: 'OUT',
          reason: input.reason,
          createdByUserId: actor,
        },
      });
      const incoming = await tx.stockMovement.create({
        data: {
          tenantId,
          productId: input.productId,
          warehouseId: input.toWarehouseId,
          transferId: transfer.id,
          quantity: input.quantity,
          type: 'TRANSFER',
          direction: 'IN',
          reason: input.reason,
          createdByUserId: actor,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: actor,
          action: 'STOCK_TRANSFERRED',
          entityId: transfer.id,
        },
      });
      const [source, destination] = await Promise.all([
        this.currentBalance(
          tx,
          tenantId,
          input.fromWarehouseId,
          input.productId,
        ),
        this.currentBalance(tx, tenantId, input.toWarehouseId, input.productId),
      ]);
      return {
        transfer: transferView(transfer),
        source,
        destination,
        movements: [movementView(outgoing), movementView(incoming)],
      };
    });
  }

  async balances(
    tenantId: string,
    query: InventoryQuery,
  ): Promise<CatalogPage<InventoryBalanceView>> {
    const p = pagination(query);
    if (query.lowStock) return this.lowStock(tenantId, query, p);
    const where: Prisma.InventoryBalanceWhereInput = {
      tenantId,
      productId: query.productId,
      warehouseId: query.warehouseId,
    };
    const [rows, total] = await Promise.all([
      this.database.client.inventoryBalance.findMany({
        where,
        include: balanceInclude,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { product: { name: 'asc' } },
          { warehouse: { name: 'asc' } },
          { id: 'asc' },
        ],
      }),
      this.database.client.inventoryBalance.count({ where }),
    ]);
    return {
      items: rows.map(balanceView),
      page: p.page,
      pageSize: p.pageSize,
      total,
    };
  }

  private async lowStock(
    tenantId: string,
    query: InventoryQuery,
    p: ReturnType<typeof pagination>,
  ): Promise<CatalogPage<InventoryBalanceView>> {
    const filters = [
      Prisma.sql`b."tenantId" = ${tenantId}::uuid`,
      Prisma.sql`p."minStock" IS NOT NULL`,
      Prisma.sql`b."quantity" <= p."minStock"`,
    ];
    if (query.productId)
      filters.push(Prisma.sql`b."productId" = ${query.productId}::uuid`);
    if (query.warehouseId)
      filters.push(Prisma.sql`b."warehouseId" = ${query.warehouseId}::uuid`);
    const condition = Prisma.join(filters, ' AND ');
    const [ids, counts] = await Promise.all([
      this.database.client.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT b."id" FROM "InventoryBalance" b JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId" JOIN "Warehouse" w ON w."id" = b."warehouseId" AND w."tenantId" = b."tenantId" WHERE ${condition} ORDER BY p."name", w."name", b."id" OFFSET ${p.skip} LIMIT ${p.take}`,
      ),
      this.database.client.$queryRaw<{ count: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "InventoryBalance" b JOIN "Product" p ON p."id" = b."productId" AND p."tenantId" = b."tenantId" WHERE ${condition}`,
      ),
    ]);
    const rows = await this.database.client.inventoryBalance.findMany({
      where: { id: { in: ids.map((item) => item.id) }, tenantId },
      include: balanceInclude,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      items: ids.flatMap((item) => {
        const row = byId.get(item.id);
        return row ? [balanceView(row)] : [];
      }),
      page: p.page,
      pageSize: p.pageSize,
      total: Number(counts[0]?.count ?? 0n),
    };
  }

  async movements(
    tenantId: string,
    query: MovementQuery,
  ): Promise<CatalogPage<StockMovementView>> {
    const p = pagination(query);
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      productId: query.productId,
      warehouseId: query.warehouseId,
      type: query.type,
      createdByUserId: query.createdByUserId,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };
    const [rows, total] = await Promise.all([
      this.database.client.stockMovement.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.database.client.stockMovement.count({ where }),
    ]);
    return {
      items: rows.map(movementView),
      page: p.page,
      pageSize: p.pageSize,
      total,
    };
  }

  async transfers(
    tenantId: string,
    query: TransferQuery,
  ): Promise<CatalogPage<StockTransferView>> {
    const p = pagination(query);
    const where: Prisma.StockTransferWhereInput = {
      tenantId,
      productId: query.productId,
    };
    const [rows, total] = await Promise.all([
      this.database.client.stockTransfer.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.database.client.stockTransfer.count({ where }),
    ]);
    return {
      items: rows.map(transferView),
      page: p.page,
      pageSize: p.pageSize,
      total,
    };
  }

  async transferById(tenantId: string, id: string): Promise<StockTransferView> {
    const transfer = await this.database.client.stockTransfer.findFirst({
      where: { id, tenantId },
    });
    if (!transfer) throw new NotFoundException();
    return transferView(transfer);
  }
}
