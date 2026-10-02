import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Prisma, PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { bootstrapIdentity } from './bootstrap';
import { hashPassword } from './password';

config({ path: resolve(process.cwd(), '../../.env') });

describe('inventory and movements', () => {
  let app: INestApplication;
  let database: PrismaClient;
  let tenantA: string;
  let tenantB: string;
  let ownerA: string;
  let ownerB: string;
  let viewerId: string;
  let branchManagerId: string;
  let managerId: string;
  let productA: string;
  let productConcurrent: string;
  let productB: string;
  let warehouseA1: string;
  let warehouseA2: string;
  let warehouseB: string;
  let firstTransferId: string;
  const suffix = randomUUID();
  const password = `inventory-${suffix}`;
  const emailA = `inventory-a-${suffix}@example.test`;
  const emailB = `inventory-b-${suffix}@example.test`;
  const viewerEmail = `inventory-viewer-${suffix}@example.test`;
  const branchEmail = `inventory-branch-${suffix}@example.test`;
  const managerEmail = `inventory-manager-${suffix}@example.test`;

  beforeAll(async () => {
    database = new PrismaClient();
    const a = await bootstrapIdentity(database, {
      email: emailA,
      password,
      tenantName: `Inventory A ${suffix}`,
    });
    const b = await bootstrapIdentity(database, {
      email: emailB,
      password,
      tenantName: `Inventory B ${suffix}`,
    });
    tenantA = a.tenantId;
    tenantB = b.tenantId;
    ownerA = a.userId;
    ownerB = b.userId;
    const companyA = await database.company.create({
      data: { tenantId: tenantA, name: 'Company A' },
    });
    const companyB = await database.company.create({
      data: { tenantId: tenantB, name: 'Company B' },
    });
    const branchA = await database.branch.create({
      data: { tenantId: tenantA, companyId: companyA.id, name: 'Branch A' },
    });
    const branchB = await database.branch.create({
      data: { tenantId: tenantB, companyId: companyB.id, name: 'Branch B' },
    });
    warehouseA1 = (
      await database.warehouse.create({
        data: {
          tenantId: tenantA,
          branchId: branchA.id,
          name: 'Warehouse A1',
          type: 'GENERAL',
        },
      })
    ).id;
    warehouseA2 = (
      await database.warehouse.create({
        data: {
          tenantId: tenantA,
          branchId: branchA.id,
          name: 'Warehouse A2',
          type: 'GENERAL',
        },
      })
    ).id;
    warehouseB = (
      await database.warehouse.create({
        data: {
          tenantId: tenantB,
          branchId: branchB.id,
          name: 'Warehouse B',
          type: 'GENERAL',
        },
      })
    ).id;
    productA = (
      await database.product.create({
        data: {
          tenantId: tenantA,
          name: 'Product A',
          unitOfMeasure: 'unit',
          minStock: '3',
        },
      })
    ).id;
    productConcurrent = (
      await database.product.create({
        data: {
          tenantId: tenantA,
          name: 'Concurrent Product',
          unitOfMeasure: 'unit',
        },
      })
    ).id;
    productB = (
      await database.product.create({
        data: {
          tenantId: tenantB,
          name: 'Product B',
          unitOfMeasure: 'unit',
          minStock: '2',
        },
      })
    ).id;
    const roles = await database.role.findMany({
      where: { tenantId: tenantA },
      select: { id: true, name: true },
    });
    for (const [email, name, roleName] of [
      [viewerEmail, 'Viewer', 'Viewer'],
      [branchEmail, 'Branch Manager', 'BranchManager'],
      [managerEmail, 'Inventory Manager', 'InventoryManager'],
    ] as const) {
      const user = await database.user.create({
        data: { email, name, passwordHash: await hashPassword(password) },
      });
      const role = roles.find((item) => item.name === roleName);
      if (!role) throw new Error(`Missing role ${roleName}`);
      await database.tenantMembership.create({
        data: { tenantId: tenantA, userId: user.id, roleId: role.id },
      });
      if (roleName === 'Viewer') viewerId = user.id;
      if (roleName === 'BranchManager') branchManagerId = user.id;
      if (roleName === 'InventoryManager') managerId = user.id;
    }
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
    if (database && tenantA && tenantB) {
      const tenantIds = [tenantA, tenantB];
      const userIds = [ownerA, ownerB, viewerId, branchManagerId, managerId];
      await database.stockMovement.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.stockTransfer.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.inventoryBalance.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.auditLog.deleteMany({
        where: { actorUserId: { in: userIds } },
      });
      await database.session.deleteMany({ where: { userId: { in: userIds } } });
      await database.product.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.warehouse.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.branch.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.company.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.tenantMembership.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      const roles = await database.role.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { id: true },
      });
      await database.rolePermission.deleteMany({
        where: { roleId: { in: roles.map((role) => role.id) } },
      });
      await database.role.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await database.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await database?.$disconnect();
  }, 60000);

  async function agent(email: string, tenantId: string) {
    const client = request.agent(app.getHttpServer());
    await client
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    await client
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId })
      .expect(200);
    return client;
  }

  it('records initial stock, entry, issue and adjustments without negative balances', async () => {
    const owner = await agent(emailA, tenantA);
    const base = { productId: productA, warehouseId: warehouseA1 };
    const initial = await owner
      .post('/api/v1/inventory/initial-stock')
      .send({ ...base, quantity: '5' })
      .expect(201);
    expect(initial.body.balance.quantity).toBe('5');
    expect(initial.body.movement).toMatchObject({
      type: 'INITIAL',
      direction: 'IN',
      quantity: '5',
    });
    await owner
      .post('/api/v1/inventory/initial-stock')
      .send({ ...base, quantity: '1' })
      .expect(409);
    expect(
      (
        await owner
          .post('/api/v1/inventory/entries')
          .send({ ...base, quantity: '2.5' })
          .expect(201)
      ).body.balance.quantity,
    ).toBe('7.5');
    expect(
      (
        await owner
          .post('/api/v1/inventory/issues')
          .send({ ...base, quantity: '3' })
          .expect(201)
      ).body.balance.quantity,
    ).toBe('4.5');
    await owner
      .post('/api/v1/inventory/issues')
      .send({ ...base, quantity: '5' })
      .expect(409);
    await owner
      .post('/api/v1/inventory/adjustments')
      .send({ ...base, quantity: '1', direction: 'IN' })
      .expect(400);
    expect(
      (
        await owner
          .post('/api/v1/inventory/adjustments')
          .send({
            ...base,
            quantity: '1',
            direction: 'IN',
            reason: 'Count correction',
          })
          .expect(201)
      ).body.balance.quantity,
    ).toBe('5.5');
    expect(
      (
        await owner
          .post('/api/v1/inventory/adjustments')
          .send({
            ...base,
            quantity: '2',
            direction: 'OUT',
            reason: 'Damaged unit',
          })
          .expect(201)
      ).body.balance.quantity,
    ).toBe('3.5');
    await owner
      .post('/api/v1/inventory/adjustments')
      .send({ ...base, quantity: '4', direction: 'OUT', reason: 'Invalid' })
      .expect(409);
    await owner
      .post('/api/v1/inventory/entries')
      .send({ ...base, quantity: '-1' })
      .expect(400);
    expect(
      (
        await owner
          .get(
            `/api/v1/inventory?productId=${productA}&warehouseId=${warehouseA1}`,
          )
          .expect(200)
      ).body.items[0].quantity,
    ).toBe('3.5');
    const audit = await database.auditLog.findMany({
      where: {
        tenantId: tenantA,
        actorUserId: ownerA,
        action: { in: ['INITIAL_STOCK_RECORDED', 'STOCK_ADJUSTED'] },
      },
    });
    expect(
      audit.filter((item) => item.action === 'INITIAL_STOCK_RECORDED'),
    ).toHaveLength(1);
    expect(
      audit.filter((item) => item.action === 'STOCK_ADJUSTED'),
    ).toHaveLength(2);
    expect(
      await database.stockMovement.count({
        where: { tenantId: tenantA, productId: productA },
      }),
    ).toBe(5);
  });

  it('moves stock atomically and rolls back failed transfers', async () => {
    const owner = await agent(emailA, tenantA);
    const input = {
      productId: productA,
      fromWarehouseId: warehouseA1,
      toWarehouseId: warehouseA2,
      quantity: '2',
    };
    const result = await owner
      .post('/api/v1/transfers')
      .send(input)
      .expect(201);
    firstTransferId = result.body.transfer.id;
    expect(result.body.source.quantity).toBe('1.5');
    expect(result.body.destination.quantity).toBe('2');
    expect(
      result.body.movements.map(
        (item: { direction: string }) => item.direction,
      ),
    ).toEqual(['OUT', 'IN']);
    expect(
      (await owner.get(`/api/v1/transfers/${firstTransferId}`).expect(200)).body
        .status,
    ).toBe('COMPLETED');
    const beforeMovements = await database.stockMovement.count({
      where: { tenantId: tenantA, type: 'TRANSFER' },
    });
    await owner.post('/api/v1/transfers').send(input).expect(409);
    expect(
      await database.stockTransfer.count({ where: { tenantId: tenantA } }),
    ).toBe(1);
    expect(
      await database.stockMovement.count({
        where: { tenantId: tenantA, type: 'TRANSFER' },
      }),
    ).toBe(beforeMovements);
    expect(
      (
        await owner
          .get(
            `/api/v1/inventory?productId=${productA}&warehouseId=${warehouseA2}`,
          )
          .expect(200)
      ).body.items[0].quantity,
    ).toBe('2');
    expect(
      await database.auditLog.count({
        where: { tenantId: tenantA, action: 'STOCK_TRANSFERRED' },
      }),
    ).toBe(1);
  });

  it('enforces tenant isolation and inventory permissions', async () => {
    const owner = await agent(emailA, tenantA);
    const other = await agent(emailB, tenantB);
    await owner
      .post('/api/v1/inventory/entries')
      .send({ productId: productB, warehouseId: warehouseA1, quantity: '1' })
      .expect(404);
    await owner
      .post('/api/v1/inventory/entries')
      .send({ productId: productA, warehouseId: warehouseB, quantity: '1' })
      .expect(404);
    await owner
      .post('/api/v1/transfers')
      .send({
        productId: productA,
        fromWarehouseId: warehouseA1,
        toWarehouseId: warehouseB,
        quantity: '1',
      })
      .expect(404);
    await other
      .post('/api/v1/inventory/issues')
      .send({ productId: productA, warehouseId: warehouseA1, quantity: '1' })
      .expect(404);
    expect((await other.get('/api/v1/inventory').expect(200)).body.total).toBe(
      0,
    );
    expect(
      (await other.get('/api/v1/inventory/movements').expect(200)).body.total,
    ).toBe(0);
    expect((await other.get('/api/v1/transfers').expect(200)).body.total).toBe(
      0,
    );
    await other.get(`/api/v1/transfers/${firstTransferId}`).expect(404);
    await database.product.update({
      where: { id: productA },
      data: { status: 'INACTIVE' },
    });
    try {
      await owner
        .post('/api/v1/inventory/entries')
        .send({ productId: productA, warehouseId: warehouseA1, quantity: '1' })
        .expect(404);
    } finally {
      await database.product.update({
        where: { id: productA },
        data: { status: 'ACTIVE' },
      });
    }
    await database.warehouse.update({
      where: { id: warehouseA1 },
      data: { status: 'INACTIVE' },
    });
    try {
      await owner
        .post('/api/v1/inventory/issues')
        .send({ productId: productA, warehouseId: warehouseA1, quantity: '1' })
        .expect(404);
    } finally {
      await database.warehouse.update({
        where: { id: warehouseA1 },
        data: { status: 'ACTIVE' },
      });
    }
    await request(app.getHttpServer()).get('/api/v1/inventory').expect(401);
    const viewer = await agent(viewerEmail, tenantA);
    await viewer.get('/api/v1/inventory').expect(200);
    await viewer.get('/api/v1/inventory/movements').expect(200);
    await viewer
      .post('/api/v1/inventory/entries')
      .send({ productId: productA, warehouseId: warehouseA1, quantity: '1' })
      .expect(403);
    await viewer
      .post('/api/v1/inventory/adjustments')
      .send({
        productId: productA,
        warehouseId: warehouseA1,
        quantity: '1',
        direction: 'IN',
        reason: 'Denied',
      })
      .expect(403);
    await viewer
      .post('/api/v1/transfers')
      .send({
        productId: productA,
        fromWarehouseId: warehouseA1,
        toWarehouseId: warehouseA2,
        quantity: '1',
      })
      .expect(403);
    const branch = await agent(branchEmail, tenantA);
    await branch
      .post('/api/v1/inventory/adjustments')
      .send({
        productId: productA,
        warehouseId: warehouseA1,
        quantity: '1',
        direction: 'IN',
        reason: 'Denied',
      })
      .expect(403);
    await branch
      .post('/api/v1/inventory/entries')
      .send({ productId: productA, warehouseId: warehouseA1, quantity: '1' })
      .expect(201);
    await branch
      .post('/api/v1/transfers')
      .send({
        productId: productA,
        fromWarehouseId: warehouseA1,
        toWarehouseId: warehouseA2,
        quantity: '1',
      })
      .expect(201);
    const manager = await agent(managerEmail, tenantA);
    await manager
      .post('/api/v1/inventory/adjustments')
      .send({
        productId: productA,
        warehouseId: warehouseA1,
        quantity: '1',
        direction: 'IN',
        reason: 'Count',
      })
      .expect(201);
  });

  it('paginates movement history, filters it, and reports low stock', async () => {
    const owner = await agent(emailA, tenantA);
    const page = await owner
      .get(
        `/api/v1/inventory/movements?page=1&pageSize=2&productId=${productA}`,
      )
      .expect(200);
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBeGreaterThan(2);
    const filtered = await owner
      .get(
        `/api/v1/inventory/movements?productId=${productA}&warehouseId=${warehouseA1}&type=TRANSFER&createdByUserId=${ownerA}&from=2000-01-01T00:00:00.000Z&to=2100-01-01T00:00:00.000Z`,
      )
      .expect(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.items[0].direction).toBe('OUT');
    await owner
      .get(
        '/api/v1/inventory/movements?from=2100-01-01T00:00:00.000Z&to=2000-01-01T00:00:00.000Z',
      )
      .expect(400);
    const low = await owner
      .get(`/api/v1/inventory?lowStock=true&productId=${productA}`)
      .expect(200);
    expect(low.body.total).toBe(2);
    expect(
      low.body.items.map((item: { quantity: string }) => item.quantity),
    ).toEqual(expect.arrayContaining(['2.5', '3']));
    expect(
      (
        await owner
          .get(
            `/api/v1/inventory?lowStock=true&productId=${productA}&warehouseId=${warehouseA1}`,
          )
          .expect(200)
      ).body.total,
    ).toBe(1);
    expect(
      (await owner.get('/api/v1/transfers?page=1&pageSize=1').expect(200)).body
        .items,
    ).toHaveLength(1);
  });

  it('prevents double discount under concurrent requests', async () => {
    const owner = await agent(emailA, tenantA);
    const input = { productId: productConcurrent, warehouseId: warehouseA1 };
    await owner
      .post('/api/v1/inventory/initial-stock')
      .send({ ...input, quantity: '5' })
      .expect(201);
    const responses = await Promise.all([
      owner.post('/api/v1/inventory/issues').send({ ...input, quantity: '4' }),
      owner.post('/api/v1/inventory/issues').send({ ...input, quantity: '4' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      (
        await owner
          .get(`/api/v1/inventory?productId=${productConcurrent}`)
          .expect(200)
      ).body.items[0].quantity,
    ).toBe('1');
    const entries = await Promise.all([
      owner.post('/api/v1/inventory/entries').send({ ...input, quantity: '2' }),
      owner.post('/api/v1/inventory/entries').send({ ...input, quantity: '2' }),
    ]);
    expect(entries.map((response) => response.status)).toEqual([201, 201]);
    expect(
      (
        await owner
          .get(`/api/v1/inventory?productId=${productConcurrent}`)
          .expect(200)
      ).body.items[0].quantity,
    ).toBe('5');
    const newProduct = (
      await database.product.create({
        data: {
          tenantId: tenantA,
          name: 'New Concurrent Product',
          unitOfMeasure: 'unit',
        },
      })
    ).id;
    const freshInput = {
      productId: newProduct,
      warehouseId: warehouseA1,
      quantity: '2',
    };
    const firstEntries = await Promise.all([
      owner.post('/api/v1/inventory/entries').send(freshInput),
      owner.post('/api/v1/inventory/entries').send(freshInput),
    ]);
    expect(firstEntries.map((response) => response.status)).toEqual([201, 201]);
    expect(
      (await owner.get(`/api/v1/inventory?productId=${newProduct}`).expect(200))
        .body.items[0].quantity,
    ).toBe('4');
    await owner
      .post('/api/v1/inventory/entries')
      .send({
        productId: productConcurrent,
        warehouseId: warehouseA2,
        quantity: '5',
      })
      .expect(201);
    const opposite = await Promise.all([
      owner.post('/api/v1/transfers').send({
        productId: productConcurrent,
        fromWarehouseId: warehouseA1,
        toWarehouseId: warehouseA2,
        quantity: '1',
      }),
      owner.post('/api/v1/transfers').send({
        productId: productConcurrent,
        fromWarehouseId: warehouseA2,
        toWarehouseId: warehouseA1,
        quantity: '1',
      }),
    ]);
    expect(opposite.map((response) => response.status)).toEqual([201, 201]);
    expect(
      (
        await owner
          .get(`/api/v1/inventory?productId=${productConcurrent}`)
          .expect(200)
      ).body.items.map((item: { quantity: string }) => item.quantity),
    ).toEqual(['5', '5']);
  });

  it('keeps each balance equal to the signed movement history', async () => {
    for (const productId of [productA, productConcurrent]) {
      for (const warehouseId of [warehouseA1, warehouseA2]) {
        const movements = await database.stockMovement.findMany({
          where: { tenantId: tenantA, productId, warehouseId },
        });
        const expected = movements.reduce(
          (total, item) =>
            item.direction === 'IN'
              ? total.add(item.quantity)
              : total.sub(item.quantity),
          new Prisma.Decimal(0),
        );
        const balance = await database.inventoryBalance.findUnique({
          where: {
            tenantId_warehouseId_productId: {
              tenantId: tenantA,
              productId,
              warehouseId,
            },
          },
        });
        expect(balance?.quantity.toString() ?? '0').toBe(expected.toString());
      }
    }
  });
});
