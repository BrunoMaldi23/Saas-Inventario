import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { CatalogQuery } from '@inventario/types';
import type {
  branchCreateSchema,
  branchUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  companyCreateSchema,
  companyUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  warehouseCreateSchema,
  warehouseUpdateSchema,
} from '@inventario/validation';
import { DatabaseService } from './database.service';

type CreateCompany = z.output<typeof companyCreateSchema>;
type UpdateCompany = z.output<typeof companyUpdateSchema>;
type CreateBranch = z.output<typeof branchCreateSchema>;
type UpdateBranch = z.output<typeof branchUpdateSchema>;
type CreateCategory = z.output<typeof categoryCreateSchema>;
type UpdateCategory = z.output<typeof categoryUpdateSchema>;
type CreateProduct = z.output<typeof productCreateSchema>;
type UpdateProduct = z.output<typeof productUpdateSchema>;
type CreateSupplier = z.output<typeof supplierCreateSchema>;
type UpdateSupplier = z.output<typeof supplierUpdateSchema>;
type CreateWarehouse = z.output<typeof warehouseCreateSchema>;
type UpdateWarehouse = z.output<typeof warehouseUpdateSchema>;

function paging(query: CatalogQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function search(query: CatalogQuery) {
  return query.search
    ? { contains: query.search, mode: 'insensitive' as const }
    : undefined;
}

function databaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      throw new ConflictException('Catalog value already exists');
    if (error.code === 'P2003')
      throw new BadRequestException('Invalid catalog relation');
  }
  throw error;
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  private async audited<T extends { id: string }>(
    tenantId: string,
    actorUserId: string,
    action: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.database.client.$transaction(async (tx) => {
        const result = await operation(tx);
        await tx.auditLog.create({
          data: { tenantId, actorUserId, action, entityId: result.id },
        });
        return result;
      });
    } catch (error) {
      return databaseError(error);
    }
  }

  async companies(tenantId: string, query: CatalogQuery) {
    const p = paging(query);
    const where: Prisma.CompanyWhereInput = {
      tenantId,
      status: query.status,
      name: search(query),
    };
    const [items, total] = await Promise.all([
      this.database.client.company.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.database.client.company.count({ where }),
    ]);
    return { items, page: p.page, pageSize: p.pageSize, total };
  }
  async company(tenantId: string, id: string) {
    const item = await this.database.client.company.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  createCompany(tenantId: string, actor: string, input: CreateCompany) {
    return this.audited(tenantId, actor, 'COMPANY_CREATED', (tx) =>
      tx.company.create({ data: { ...input, tenantId } }),
    );
  }
  async updateCompany(
    tenantId: string,
    actor: string,
    id: string,
    input: UpdateCompany,
  ) {
    await this.company(tenantId, id);
    return this.audited(tenantId, actor, 'COMPANY_UPDATED', (tx) =>
      tx.company.update({ where: { id, tenantId }, data: input }),
    );
  }

  async branches(tenantId: string, query: CatalogQuery) {
    const p = paging(query);
    const where: Prisma.BranchWhereInput = {
      tenantId,
      status: query.status,
      name: search(query),
    };
    const [items, total] = await Promise.all([
      this.database.client.branch.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.database.client.branch.count({ where }),
    ]);
    return { items, page: p.page, pageSize: p.pageSize, total };
  }
  async branch(tenantId: string, id: string) {
    const item = await this.database.client.branch.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  private async activeCompany(tenantId: string, id: string) {
    if (
      !(await this.database.client.company.findFirst({
        where: { id, tenantId, status: 'ACTIVE' },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Company not found');
  }
  async createBranch(tenantId: string, actor: string, input: CreateBranch) {
    await this.activeCompany(tenantId, input.companyId);
    return this.audited(tenantId, actor, 'BRANCH_CREATED', (tx) =>
      tx.branch.create({ data: { ...input, tenantId } }),
    );
  }
  async updateBranch(
    tenantId: string,
    actor: string,
    id: string,
    input: UpdateBranch,
  ) {
    await this.branch(tenantId, id);
    if (input.companyId) await this.activeCompany(tenantId, input.companyId);
    return this.audited(tenantId, actor, 'BRANCH_UPDATED', (tx) =>
      tx.branch.update({ where: { id, tenantId }, data: input }),
    );
  }

  async categories(tenantId: string, query: CatalogQuery) {
    const p = paging(query);
    const where: Prisma.CategoryWhereInput = {
      tenantId,
      status: query.status,
      name: search(query),
    };
    const [items, total] = await Promise.all([
      this.database.client.category.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.database.client.category.count({ where }),
    ]);
    return { items, page: p.page, pageSize: p.pageSize, total };
  }
  async category(tenantId: string, id: string) {
    const item = await this.database.client.category.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  private async activeCategory(tenantId: string, id: string, selfId?: string) {
    const seen = new Set<string>(selfId ? [selfId] : []);
    let cursor: string | null = id;
    while (cursor) {
      if (seen.has(cursor)) throw new BadRequestException('Category cycle');
      seen.add(cursor);
      const node: { parentId: string | null; status: string } | null =
        await this.database.client.category.findFirst({
          where: { id: cursor, tenantId },
          select: { parentId: true, status: true },
        });
      if (!node || node.status !== 'ACTIVE')
        throw new NotFoundException('Category not found');
      cursor = node.parentId;
    }
  }
  async createCategory(tenantId: string, actor: string, input: CreateCategory) {
    if (input.parentId) await this.activeCategory(tenantId, input.parentId);
    return this.audited(tenantId, actor, 'CATEGORY_CREATED', (tx) =>
      tx.category.create({ data: { ...input, tenantId } }),
    );
  }
  async updateCategory(
    tenantId: string,
    actor: string,
    id: string,
    input: UpdateCategory,
  ) {
    await this.category(tenantId, id);
    if (input.parentId) await this.activeCategory(tenantId, input.parentId, id);
    return this.audited(tenantId, actor, 'CATEGORY_UPDATED', (tx) =>
      tx.category.update({ where: { id, tenantId }, data: input }),
    );
  }

  async products(tenantId: string, query: CatalogQuery) {
    const p = paging(query);
    const where: Prisma.ProductWhereInput = {
      tenantId,
      status: query.status,
      OR: query.search
        ? [
            { name: search(query) },
            { sku: search(query) },
            { barcode: search(query) },
          ]
        : undefined,
    };
    const [items, total] = await Promise.all([
      this.database.client.product.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.database.client.product.count({ where }),
    ]);
    return { items, page: p.page, pageSize: p.pageSize, total };
  }
  async product(tenantId: string, id: string) {
    const item = await this.database.client.product.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  async createProduct(tenantId: string, actor: string, input: CreateProduct) {
    if (input.categoryId) await this.activeCategory(tenantId, input.categoryId);
    return this.audited(tenantId, actor, 'PRODUCT_CREATED', (tx) =>
      tx.product.create({
        data: {
          ...input,
          sku: input.sku === null ? null : input.sku?.toUpperCase(),
          tenantId,
        },
      }),
    );
  }
  async updateProduct(
    tenantId: string,
    actor: string,
    id: string,
    input: UpdateProduct,
  ) {
    await this.product(tenantId, id);
    if (input.categoryId) await this.activeCategory(tenantId, input.categoryId);
    return this.audited(tenantId, actor, 'PRODUCT_UPDATED', (tx) =>
      tx.product.update({
        where: { id, tenantId },
        data: {
          ...input,
          sku: input.sku === null ? null : input.sku?.toUpperCase(),
        },
      }),
    );
  }

  async suppliers(tenantId: string, query: CatalogQuery) {
    const p = paging(query);
    const where: Prisma.SupplierWhereInput = {
      tenantId,
      status: query.status,
      name: search(query),
    };
    const [items, total] = await Promise.all([
      this.database.client.supplier.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.database.client.supplier.count({ where }),
    ]);
    return { items, page: p.page, pageSize: p.pageSize, total };
  }
  async supplier(tenantId: string, id: string) {
    const item = await this.database.client.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  createSupplier(tenantId: string, actor: string, input: CreateSupplier) {
    return this.audited(tenantId, actor, 'SUPPLIER_CREATED', (tx) =>
      tx.supplier.create({ data: { ...input, tenantId } }),
    );
  }
  async updateSupplier(
    tenantId: string,
    actor: string,
    id: string,
    input: UpdateSupplier,
  ) {
    await this.supplier(tenantId, id);
    return this.audited(tenantId, actor, 'SUPPLIER_UPDATED', (tx) =>
      tx.supplier.update({ where: { id, tenantId }, data: input }),
    );
  }

  async warehouses(tenantId: string, query: CatalogQuery) {
    const p = paging(query);
    const where: Prisma.WarehouseWhereInput = {
      tenantId,
      status: query.status,
      name: search(query),
    };
    const [items, total] = await Promise.all([
      this.database.client.warehouse.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.database.client.warehouse.count({ where }),
    ]);
    return { items, page: p.page, pageSize: p.pageSize, total };
  }
  async warehouse(tenantId: string, id: string) {
    const item = await this.database.client.warehouse.findFirst({
      where: { id, tenantId },
    });
    if (!item) throw new NotFoundException();
    return item;
  }
  private async activeBranch(tenantId: string, id: string) {
    if (
      !(await this.database.client.branch.findFirst({
        where: { id, tenantId, status: 'ACTIVE' },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Branch not found');
  }
  async createWarehouse(
    tenantId: string,
    actor: string,
    input: CreateWarehouse,
  ) {
    await this.activeBranch(tenantId, input.branchId);
    return this.audited(tenantId, actor, 'WAREHOUSE_CREATED', (tx) =>
      tx.warehouse.create({ data: { ...input, tenantId } }),
    );
  }
  async updateWarehouse(
    tenantId: string,
    actor: string,
    id: string,
    input: UpdateWarehouse,
  ) {
    await this.warehouse(tenantId, id);
    if (input.branchId) await this.activeBranch(tenantId, input.branchId);
    return this.audited(tenantId, actor, 'WAREHOUSE_UPDATED', (tx) =>
      tx.warehouse.update({ where: { id, tenantId }, data: input }),
    );
  }
}
