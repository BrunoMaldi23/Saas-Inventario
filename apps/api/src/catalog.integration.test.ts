import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { bootstrapIdentity } from './bootstrap';
import { hashPassword } from './password';

config({ path: resolve(process.cwd(), '../../.env') });

describe('operational catalog', () => {
  let app: INestApplication;
  let database: PrismaClient;
  let tenantA: string;
  let tenantB: string;
  let ownerA: string;
  let ownerB: string;
  let viewerId: string;
  let managerId: string;
  let viewerRole: string;
  let companyA: string;
  let branchA: string;
  let categoryA: string;
  let productA: string;
  let supplierA: string;
  let warehouseA: string;
  const suffix = randomUUID();
  const password = `catalog-${suffix}`;
  const emailA = `catalog-a-${suffix}@example.test`;
  const emailB = `catalog-b-${suffix}@example.test`;
  const viewerEmail = `catalog-viewer-${suffix}@example.test`;
  const managerEmail = `catalog-manager-${suffix}@example.test`;

  beforeAll(async () => {
    database = new PrismaClient();
    const a = await bootstrapIdentity(database, {
      email: emailA,
      password,
      tenantName: `Catalog A ${suffix}`,
    });
    const b = await bootstrapIdentity(database, {
      email: emailB,
      password,
      tenantName: `Catalog B ${suffix}`,
    });
    tenantA = a.tenantId;
    tenantB = b.tenantId;
    ownerA = a.userId;
    ownerB = b.userId;
    viewerRole = (
      await database.role.findUniqueOrThrow({
        where: { tenantId_name: { tenantId: tenantA, name: 'Viewer' } },
      })
    ).id;
    const viewer = await database.user.create({
      data: {
        email: viewerEmail,
        name: 'Viewer',
        passwordHash: await hashPassword(password),
      },
    });
    viewerId = viewer.id;
    await database.tenantMembership.create({
      data: { tenantId: tenantA, userId: viewerId, roleId: viewerRole },
    });
    const manager = await database.user.create({
      data: {
        email: managerEmail,
        name: 'Inventory Manager',
        passwordHash: await hashPassword(password),
      },
    });
    managerId = manager.id;
    const managerRole = await database.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenantA, name: 'InventoryManager' } },
    });
    await database.tenantMembership.create({
      data: { tenantId: tenantA, userId: managerId, roleId: managerRole.id },
    });
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
      const userIds = [ownerA, ownerB, viewerId, managerId];
      await database.warehouse.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.product.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.category.deleteMany({
        where: { tenantId: { in: tenantIds }, parentId: { not: null } },
      });
      await database.category.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.supplier.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.branch.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.company.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.session.deleteMany({ where: { userId: { in: userIds } } });
      await database.auditLog.deleteMany({
        where: { actorUserId: { in: userIds } },
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

  it('creates, reads, updates and lists every catalog resource within the active tenant', async () => {
    const a = await agent(emailA, tenantA);
    companyA = (
      await a
        .post('/api/v1/companies')
        .send({ name: 'Empresa A', taxId: 'TAX-A' })
        .expect(201)
    ).body.id;
    branchA = (
      await a
        .post('/api/v1/branches')
        .send({ companyId: companyA, name: 'Sucursal A' })
        .expect(201)
    ).body.id;
    categoryA = (
      await a.post('/api/v1/categories').send({ name: 'Bebidas' }).expect(201)
    ).body.id;
    productA = (
      await a
        .post('/api/v1/products')
        .send({
          categoryId: categoryA,
          name: 'Agua',
          unitOfMeasure: 'unit',
          sku: 'sku-a',
          barcode: '780001',
          minStock: '2.500',
        })
        .expect(201)
    ).body.id;
    supplierA = (
      await a
        .post('/api/v1/suppliers')
        .send({ name: 'Proveedor A', email: 'supplier@example.test' })
        .expect(201)
    ).body.id;
    warehouseA = (
      await a
        .post('/api/v1/warehouses')
        .send({ branchId: branchA, name: 'Principal', type: 'GENERAL' })
        .expect(201)
    ).body.id;
    for (const [path, id] of [
      ['companies', companyA],
      ['branches', branchA],
      ['categories', categoryA],
      ['products', productA],
      ['suppliers', supplierA],
      ['warehouses', warehouseA],
    ]) {
      await a.get(`/api/v1/${path}/${id}`).expect(200);
      const list = await a.get(`/api/v1/${path}?page=1&pageSize=1`).expect(200);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.total).toBe(1);
      expect(list.body.totalPages).toBe(1);
      await a
        .patch(`/api/v1/${path}/${id}`)
        .send({ status: 'INACTIVE' })
        .expect(200);
      expect(
        (await a.get(`/api/v1/${path}/${id}`).expect(200)).body.status,
      ).toBe('INACTIVE');
      expect(
        (await a.get(`/api/v1/${path}?status=ACTIVE`).expect(200)).body.total,
      ).toBe(0);
      expect(
        (await a.get(`/api/v1/${path}?status=INACTIVE`).expect(200)).body.total,
      ).toBe(1);
      await a
        .patch(`/api/v1/${path}/${id}`)
        .send({ status: 'ACTIVE' })
        .expect(200);
    }
    expect(
      (await a.get('/api/v1/products?search=sku-a').expect(200)).body.total,
    ).toBe(1);
    expect(
      (await a.get('/api/v1/products?search=missing').expect(200)).body.total,
    ).toBe(0);
    expect(
      (await a.get(`/api/v1/products/${productA}`).expect(200)).body.sku,
    ).toBe('SKU-A');
    expect(
      (await a.get(`/api/v1/products/${productA}`).expect(200)).body.minStock,
    ).toBe('2.5');
    expect(
      (await a.get(`/api/v1/products/${productA}`).expect(200)).body.category,
    ).toEqual({ id: categoryA, name: 'Bebidas' });
    expect(
      (await a.get(`/api/v1/branches/${branchA}`).expect(200)).body.company,
    ).toEqual({ id: companyA, name: 'Empresa A' });
    expect(
      (await a.get(`/api/v1/warehouses/${warehouseA}`).expect(200)).body.branch,
    ).toEqual({ id: branchA, name: 'Sucursal A' });
    await a
      .post('/api/v1/products')
      .send({ tenantId: tenantB, name: 'Invalid', unitOfMeasure: 'unit' })
      .expect(400);
    await a.get('/api/v1/products?pageSize=101').expect(400);
    const audit = await database.auditLog.findMany({
      where: { tenantId: tenantA, action: { startsWith: 'PRODUCT_' } },
    });
    expect(audit.map((event) => event.action)).toEqual(
      expect.arrayContaining(['PRODUCT_CREATED', 'PRODUCT_UPDATED']),
    );
  });

  it('rejects cross-tenant records and relations while allowing repeated codes in another tenant', async () => {
    const a = await agent(emailA, tenantA);
    const b = await agent(emailB, tenantB);
    for (const [path, id] of [
      ['companies', companyA],
      ['branches', branchA],
      ['categories', categoryA],
      ['products', productA],
      ['suppliers', supplierA],
      ['warehouses', warehouseA],
    ]) {
      await b.get(`/api/v1/${path}/${id}`).expect(404);
      await b
        .patch(`/api/v1/${path}/${id}`)
        .send({ name: 'Intrusion' })
        .expect(404);
      expect((await b.get(`/api/v1/${path}`).expect(200)).body.total).toBe(0);
    }
    await b
      .post('/api/v1/branches')
      .send({ companyId: companyA, name: 'Bad' })
      .expect(404);
    await b
      .post('/api/v1/categories')
      .send({ parentId: categoryA, name: 'Bad' })
      .expect(404);
    await b
      .post('/api/v1/products')
      .send({ categoryId: categoryA, name: 'Bad', unitOfMeasure: 'unit' })
      .expect(404);
    await b
      .post('/api/v1/warehouses')
      .send({ branchId: branchA, name: 'Bad', type: 'GENERAL' })
      .expect(404);
    const companyB = (
      await b
        .post('/api/v1/companies')
        .send({ name: 'Empresa B', taxId: 'TAX-A' })
        .expect(201)
    ).body.id;
    const branchB = (
      await b
        .post('/api/v1/branches')
        .send({ companyId: companyB, name: 'Sucursal B' })
        .expect(201)
    ).body.id;
    const productB = (
      await b
        .post('/api/v1/products')
        .send({
          name: 'Agua B',
          unitOfMeasure: 'unit',
          sku: 'SKU-A',
          barcode: '780001',
        })
        .expect(201)
    ).body.id;
    await b
      .patch(`/api/v1/branches/${branchB}`)
      .send({ companyId: companyA })
      .expect(404);
    await b
      .patch(`/api/v1/products/${productB}`)
      .send({ categoryId: categoryA })
      .expect(404);
    await a
      .patch(`/api/v1/branches/${branchA}`)
      .send({ companyId: companyB })
      .expect(404);
    await a
      .post('/api/v1/companies')
      .send({ name: 'Duplicate Tax', taxId: 'TAX-A' })
      .expect(409);
    await a
      .post('/api/v1/products')
      .send({ name: 'Duplicate SKU', unitOfMeasure: 'unit', sku: 'sku-a' })
      .expect(409);
    await a
      .post('/api/v1/products')
      .send({
        name: 'Duplicate Barcode',
        unitOfMeasure: 'unit',
        barcode: '780001',
      })
      .expect(409);
    await a.post('/api/v1/categories').send({ name: 'Bebidas' }).expect(409);
    await a
      .post('/api/v1/warehouses')
      .send({ branchId: branchA, name: 'Principal', type: 'GENERAL' })
      .expect(409);
    await b.post('/api/v1/categories').send({ name: 'Bebidas' }).expect(201);
  });

  it('enforces category sibling uniqueness and rejects cycles', async () => {
    const a = await agent(emailA, tenantA);
    const parent = (
      await a.post('/api/v1/categories').send({ name: 'Alimentos' }).expect(201)
    ).body.id;
    const child = (
      await a
        .post('/api/v1/categories')
        .send({ name: 'Bebidas', parentId: parent })
        .expect(201)
    ).body.id;
    await a
      .post('/api/v1/categories')
      .send({ name: 'Bebidas', parentId: parent })
      .expect(409);
    await a
      .patch(`/api/v1/categories/${parent}`)
      .send({ parentId: child })
      .expect(400);
    await a
      .patch(`/api/v1/categories/${child}`)
      .send({ parentId: child })
      .expect(400);
  });

  it('separates read and write permissions and blocks unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/v1/products').expect(401);
    const viewer = await agent(viewerEmail, tenantA);
    for (const path of [
      'companies',
      'branches',
      'categories',
      'products',
      'suppliers',
      'warehouses',
    ]) {
      await viewer.get(`/api/v1/${path}`).expect(200);
      await viewer.post(`/api/v1/${path}`).send({ name: 'Denied' }).expect(403);
      await viewer
        .patch(`/api/v1/${path}/${randomUUID()}`)
        .send({ status: 'INACTIVE' })
        .expect(403);
    }
    const manager = await agent(managerEmail, tenantA);
    await manager.get('/api/v1/companies').expect(200);
    await manager
      .post('/api/v1/companies')
      .send({ name: 'Denied' })
      .expect(403);
    await manager
      .post('/api/v1/products')
      .send({ name: 'Manager Product', unitOfMeasure: 'unit' })
      .expect(201);
  });

  it('retains inactive records, rejects inactive relation targets, and validates inputs', async () => {
    const a = await agent(emailA, tenantA);
    await a
      .patch(`/api/v1/categories/${categoryA}`)
      .send({ status: 'INACTIVE' })
      .expect(200);
    await a
      .post('/api/v1/products')
      .send({
        categoryId: categoryA,
        name: 'Invalid parent',
        unitOfMeasure: 'unit',
      })
      .expect(404);
    await a
      .patch(`/api/v1/categories/${categoryA}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    await a
      .post('/api/v1/products')
      .send({ name: 'Invalid code', sku: 'bad code', unitOfMeasure: 'unit' })
      .expect(400);
    await a
      .post('/api/v1/products')
      .send({
        name: 'Invalid threshold',
        minStock: '-1',
        unitOfMeasure: 'unit',
      })
      .expect(400);
    await a
      .post('/api/v1/suppliers')
      .send({ name: 'Invalid email', email: 'invalid' })
      .expect(400);
    await a.get(`/api/v1/products/${randomUUID()}`).expect(404);
  });
});
