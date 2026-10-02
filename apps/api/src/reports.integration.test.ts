import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import {
  PrismaClient,
  type MovementDirection,
  type MovementType,
} from '@prisma/client';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { bootstrapIdentity } from './bootstrap';
import { hashPassword } from './password';

config({ path: resolve(process.cwd(), '../../.env') });

describe('operational reports', () => {
  let app: INestApplication;
  let database: PrismaClient;
  let tenantA: string;
  let tenantB: string;
  let ownerA: string;
  let ownerB: string;
  let viewerA: string;
  const additionalReportUsers: Array<{ id: string; email: string }> = [];
  let productWater: string;
  let productOther: string;
  let inactiveProduct: string;
  let warehouseA: string;
  let warehouseA2: string;
  let warehouseInactive: string;
  let warehouseB: string;
  const suffix = randomUUID();
  const password = `reports-${suffix}`;
  const emailA = `reports-a-${suffix}@example.test`;
  const emailB = `reports-b-${suffix}@example.test`;
  const viewerEmail = `reports-viewer-${suffix}@example.test`;
  const periodFrom = new Date('2026-09-01T00:00:00.000Z');
  const periodTo = new Date('2026-09-30T23:59:59.999Z');

  beforeAll(async () => {
    database = new PrismaClient();
    const a = await bootstrapIdentity(database, {
      email: emailA,
      password,
      tenantName: `Reports A ${suffix}`,
    });
    const b = await bootstrapIdentity(database, {
      email: emailB,
      password,
      tenantName: `Reports B ${suffix}`,
    });
    tenantA = a.tenantId;
    tenantB = b.tenantId;
    ownerA = a.userId;
    ownerB = b.userId;
    const role = await database.role.findUniqueOrThrow({
      where: { tenantId_name: { tenantId: tenantA, name: 'Viewer' } },
    });
    const viewer = await database.user.create({
      data: {
        email: viewerEmail,
        name: 'Reports Viewer',
        passwordHash: await hashPassword(password),
      },
    });
    viewerA = viewer.id;
    await database.tenantMembership.create({
      data: { tenantId: tenantA, userId: viewerA, roleId: role.id },
    });
    for (const roleName of [
      'Admin',
      'InventoryManager',
      'BranchManager',
    ] as const) {
      const roleForUser = await database.role.findUniqueOrThrow({
        where: { tenantId_name: { tenantId: tenantA, name: roleName } },
      });
      const userEmail = `reports-${roleName.toLowerCase()}-${suffix}@example.test`;
      const user = await database.user.create({
        data: {
          email: userEmail,
          name: roleName,
          passwordHash: await hashPassword(password),
        },
      });
      await database.tenantMembership.create({
        data: { tenantId: tenantA, userId: user.id, roleId: roleForUser.id },
      });
      additionalReportUsers.push({ id: user.id, email: userEmail });
    }

    const companyA = await database.company.create({
      data: { tenantId: tenantA, name: 'Reports Company A' },
    });
    const companyB = await database.company.create({
      data: { tenantId: tenantB, name: 'Reports Company B' },
    });
    const branchA = await database.branch.create({
      data: {
        tenantId: tenantA,
        companyId: companyA.id,
        name: 'Reports Branch A',
      },
    });
    const branchB = await database.branch.create({
      data: {
        tenantId: tenantB,
        companyId: companyB.id,
        name: 'Reports Branch B',
      },
    });
    const [wh1, wh2, whInactive, whB] = await Promise.all([
      database.warehouse.create({
        data: {
          tenantId: tenantA,
          branchId: branchA.id,
          name: 'Reports Warehouse 1',
          type: 'GENERAL',
        },
      }),
      database.warehouse.create({
        data: {
          tenantId: tenantA,
          branchId: branchA.id,
          name: 'Reports Warehouse 2',
          type: 'GENERAL',
        },
      }),
      database.warehouse.create({
        data: {
          tenantId: tenantA,
          branchId: branchA.id,
          name: 'Reports Warehouse Inactive',
          type: 'GENERAL',
          status: 'INACTIVE',
        },
      }),
      database.warehouse.create({
        data: {
          tenantId: tenantB,
          branchId: branchB.id,
          name: 'Reports Warehouse B',
          type: 'GENERAL',
        },
      }),
    ]);
    warehouseA = wh1.id;
    warehouseA2 = wh2.id;
    warehouseInactive = whInactive.id;
    warehouseB = whB.id;
    const category = await database.category.create({
      data: { tenantId: tenantA, name: 'Reports Category' },
    });
    const [water, other, inactive, productB] = await Promise.all([
      database.product.create({
        data: {
          tenantId: tenantA,
          name: 'Water',
          sku: 'WATER',
          unitOfMeasure: 'unit',
          minStock: '5',
          categoryId: category.id,
        },
      }),
      database.product.create({
        data: {
          tenantId: tenantA,
          name: 'Tea',
          sku: 'TEA',
          unitOfMeasure: 'unit',
        },
      }),
      database.product.create({
        data: {
          tenantId: tenantA,
          name: 'Inactive Water',
          unitOfMeasure: 'unit',
          minStock: '8',
          status: 'INACTIVE',
        },
      }),
      database.product.create({
        data: {
          tenantId: tenantB,
          name: 'Other Tenant Water',
          unitOfMeasure: 'unit',
          minStock: '10',
        },
      }),
    ]);
    productWater = water.id;
    productOther = other.id;
    inactiveProduct = inactive.id;
    await database.inventoryBalance.createMany({
      data: [
        {
          tenantId: tenantA,
          warehouseId: warehouseA,
          productId: productWater,
          quantity: '4.250',
        },
        {
          tenantId: tenantA,
          warehouseId: warehouseA2,
          productId: productWater,
          quantity: '8',
        },
        {
          tenantId: tenantA,
          warehouseId: warehouseA,
          productId: productOther,
          quantity: '12.5',
        },
        {
          tenantId: tenantA,
          warehouseId: warehouseInactive,
          productId: inactiveProduct,
          quantity: '2',
        },
        {
          tenantId: tenantB,
          warehouseId: warehouseB,
          productId: productB.id,
          quantity: '1',
        },
      ],
    });
    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(todayMidnight.getTime() - 1);
    const movements: Array<{
      tenantId: string;
      warehouseId: string;
      productId: string;
      type: MovementType;
      direction: MovementDirection;
      quantity: string;
      createdByUserId: string;
      createdAt: Date;
    }> = [
      {
        tenantId: tenantA,
        warehouseId: warehouseA,
        productId: productWater,
        type: 'ENTRY',
        direction: 'IN',
        quantity: '1.250',
        createdByUserId: ownerA,
        createdAt: periodFrom,
      },
      {
        tenantId: tenantA,
        warehouseId: warehouseA,
        productId: productWater,
        type: 'ISSUE',
        direction: 'OUT',
        quantity: '0.5',
        createdByUserId: ownerA,
        createdAt: periodTo,
      },
      {
        tenantId: tenantA,
        warehouseId: warehouseA2,
        productId: productOther,
        type: 'ENTRY',
        direction: 'IN',
        quantity: '3',
        createdByUserId: ownerA,
        createdAt: new Date('2026-09-15T12:00:00.000Z'),
      },
      {
        tenantId: tenantA,
        warehouseId: warehouseA,
        productId: productWater,
        type: 'ENTRY',
        direction: 'IN',
        quantity: '9',
        createdByUserId: ownerA,
        createdAt: todayMidnight,
      },
      {
        tenantId: tenantA,
        warehouseId: warehouseA,
        productId: productWater,
        type: 'ISSUE',
        direction: 'OUT',
        quantity: '4',
        createdByUserId: ownerA,
        createdAt: yesterday,
      },
      {
        tenantId: tenantB,
        warehouseId: warehouseB,
        productId: (
          await database.product.findFirstOrThrow({
            where: { tenantId: tenantB },
          })
        ).id,
        type: 'ENTRY',
        direction: 'IN',
        quantity: '99',
        createdByUserId: ownerB,
        createdAt: periodFrom,
      },
    ];
    await database.stockMovement.createMany({ data: movements });
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
      const users = [
        ownerA,
        ownerB,
        viewerA,
        ...additionalReportUsers.map((user) => user.id),
      ];
      await database.stockMovement.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.inventoryBalance.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.warehouse.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.product.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.category.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.branch.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.company.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      const roles = await database.role.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { id: true },
      });
      await database.session.deleteMany({ where: { userId: { in: users } } });
      await database.auditLog.deleteMany({
        where: { actorUserId: { in: users } },
      });
      await database.tenantMembership.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.rolePermission.deleteMany({
        where: { roleId: { in: roles.map((item) => item.id) } },
      });
      await database.role.deleteMany({
        where: { tenantId: { in: tenantIds } },
      });
      await database.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await database.user.deleteMany({ where: { id: { in: users } } });
    }
    await database?.$disconnect();
  }, 60000);

  async function login(email: string, tenantId = tenantA) {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    await agent
      .post('/api/v1/auth/select-tenant')
      .send({ tenantId })
      .expect(200);
    return agent;
  }

  it('builds dashboard metrics from tenant data and uses UTC day boundaries', async () => {
    const owner = await login(emailA);
    const dashboard = await owner
      .get('/api/v1/reports/dashboard')
      .query({ from: periodFrom.toISOString(), to: periodTo.toISOString() })
      .expect(200);
    expect(dashboard.body.activeProductCount).toBe(2);
    expect(dashboard.body.activeWarehouseCount).toBe(2);
    expect(dashboard.body.lowStockProductCount).toBe(1);
    expect(dashboard.body.lowStockBalanceCount).toBe(1);
    expect(dashboard.body.todayMovementCount).toBe(1);
    expect(dashboard.body.todayRange.from).toMatch(/T00:00:00\.000Z$/);
    expect(dashboard.body.periodTotalsByUnit).toEqual(
      expect.arrayContaining([
        { unitOfMeasure: 'unit', direction: 'IN', quantity: '4.25', count: 2 },
        { unitOfMeasure: 'unit', direction: 'OUT', quantity: '0.5', count: 1 },
      ]),
    );
    expect(dashboard.body.recentMovements[0]).toMatchObject({
      product: { id: productWater, name: 'Water' },
      warehouse: { id: warehouseA, name: 'Reports Warehouse 1' },
      actor: { id: ownerA },
    });
    expect(dashboard.body.lowStockProducts[0]).toMatchObject({
      product: { id: productWater, category: { name: 'Reports Category' } },
      locations: [
        { warehouse: { id: warehouseA }, quantity: '4.25', minStock: '5' },
      ],
    });
    expect(JSON.stringify(dashboard.body)).not.toContain('Other Tenant Water');
  });

  it('filters stock and low-stock products, keeps decimals, and paginates', async () => {
    const owner = await login(emailA);
    const stock = await owner
      .get('/api/v1/reports/stock?page=1&pageSize=1')
      .expect(200);
    expect(stock.body.total).toBe(4);
    expect(stock.body.totalPages).toBe(4);
    const waterStock = await owner
      .get(`/api/v1/reports/stock?productId=${productWater}`)
      .expect(200);
    expect(
      waterStock.body.items.map((row: { quantity: string }) => row.quantity),
    ).toEqual(['4.25', '8']);
    const warehouseStock = await owner
      .get(`/api/v1/reports/stock?warehouseId=${warehouseA}`)
      .expect(200);
    expect(warehouseStock.body.total).toBe(2);
    const low = await owner
      .get('/api/v1/reports/low-stock?search=water')
      .expect(200);
    expect(low.body.total).toBe(1);
    expect(low.body.items[0].product.id).toBe(productWater);
    expect(low.body.items[0].warehouseCount).toBe(1);
    expect(low.body.items[0].product.id).not.toBe(inactiveProduct);
  });

  it('reports movement period totals inclusively and supports filters and pagination', async () => {
    const owner = await login(emailA);
    const filtered = await owner
      .get('/api/v1/reports/movements')
      .query({
        from: periodFrom.toISOString(),
        to: periodTo.toISOString(),
        productId: productWater,
        warehouseId: warehouseA,
        page: 1,
        pageSize: 1,
      })
      .expect(200);
    expect(filtered.body.total).toBe(2);
    expect(filtered.body.totalPages).toBe(2);
    expect(filtered.body.items[0].createdAt).toBe(periodTo.toISOString());
    expect(filtered.body.totalsByUnit).toEqual([
      { unitOfMeasure: 'unit', direction: 'IN', quantity: '1.25', count: 1 },
      { unitOfMeasure: 'unit', direction: 'OUT', quantity: '0.5', count: 1 },
    ]);
    const warehouse = await owner
      .get('/api/v1/reports/movements')
      .query({
        from: periodFrom.toISOString(),
        to: periodTo.toISOString(),
        warehouseId: warehouseA,
      })
      .expect(200);
    expect(warehouse.body.total).toBe(2);
    await owner
      .get('/api/v1/reports/movements')
      .query({ from: periodTo.toISOString(), to: periodFrom.toISOString() })
      .expect(400);
    await owner
      .get('/api/v1/reports/movements?from=2026-09-01T00:00:00Z')
      .expect(400);
  });

  it('summarizes products and warehouses without mixing unlike units and shows statuses', async () => {
    const owner = await login(emailA);
    const warehouses = await owner
      .get('/api/v1/reports/warehouses')
      .expect(200);
    expect(
      warehouses.body.items.find(
        (item: { id: string }) => item.id === warehouseA,
      ),
    ).toMatchObject({
      balanceCount: 2,
      productCount: 2,
      lowStockBalanceCount: 1,
    });
    expect(
      warehouses.body.items.find(
        (item: { id: string }) => item.id === warehouseInactive,
      ).status,
    ).toBe('INACTIVE');
    const products = await owner
      .get('/api/v1/reports/products?status=ACTIVE')
      .expect(200);
    const water = products.body.items.find(
      (item: { id: string }) => item.id === productWater,
    );
    expect(water).toMatchObject({
      totalOnHand: '12.25',
      warehouseCount: 2,
      lowStockWarehouseCount: 1,
      category: { name: 'Reports Category' },
    });
    expect(products.body.items).toHaveLength(2);
    const allProducts = await owner.get('/api/v1/reports/products').expect(200);
    expect(
      allProducts.body.items.find(
        (item: { id: string }) => item.id === inactiveProduct,
      ),
    ).toMatchObject({
      status: 'INACTIVE',
      totalOnHand: '2',
      lowStockWarehouseCount: 0,
    });
  });

  it('allows read-only report access, rejects missing permission and scopes every tenant', async () => {
    const viewer = await login(viewerEmail);
    await viewer.get('/api/v1/reports/dashboard').expect(200);
    await viewer.get('/api/v1/reports/products').expect(200);
    for (const user of additionalReportUsers) {
      const roleAgent = await login(user.email);
      await roleAgent.get('/api/v1/reports/dashboard').expect(200);
    }
    const ownerBAgent = await login(emailB, tenantB);
    const stockB = await ownerBAgent.get('/api/v1/reports/stock').expect(200);
    expect(stockB.body.total).toBe(1);
    expect(stockB.body.items[0].product.name).toBe('Other Tenant Water');
    expect(
      (await ownerBAgent.get('/api/v1/reports/low-stock').expect(200)).body
        .total,
    ).toBe(1);
    await ownerBAgent
      .get('/api/v1/reports/stock')
      .query({ tenantId: tenantA })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/reports/dashboard')
      .expect(401);
  });

  it('returns valid empty reports for an active tenant with no catalog or stock', async () => {
    const empty = await bootstrapIdentity(database, {
      email: `empty-${suffix}@example.test`,
      password,
      tenantName: `Empty ${suffix}`,
    });
    const agent = await login(`empty-${suffix}@example.test`, empty.tenantId);
    const dashboard = await agent.get('/api/v1/reports/dashboard').expect(200);
    expect(dashboard.body).toMatchObject({
      activeProductCount: 0,
      activeWarehouseCount: 0,
      lowStockProductCount: 0,
      lowStockBalanceCount: 0,
      todayMovementCount: 0,
      recentMovements: [],
      lowStockProducts: [],
    });
    expect(
      (await agent.get('/api/v1/reports/stock').expect(200)).body,
    ).toMatchObject({ items: [], total: 0, totalPages: 0 });
    expect(
      (await agent.get('/api/v1/reports/warehouses').expect(200)).body.items,
    ).toEqual([]);
    expect(
      (await agent.get('/api/v1/reports/products').expect(200)).body.items,
    ).toEqual([]);
    // The normal fixture cleanup includes this third tenant's user and tenant.
    const roles = await database.role.findMany({
      where: { tenantId: empty.tenantId },
      select: { id: true },
    });
    await database.session.deleteMany({ where: { userId: empty.userId } });
    await database.auditLog.deleteMany({
      where: {
        OR: [{ tenantId: empty.tenantId }, { actorUserId: empty.userId }],
      },
    });
    await database.tenantMembership.deleteMany({
      where: { tenantId: empty.tenantId },
    });
    await database.rolePermission.deleteMany({
      where: { roleId: { in: roles.map((item) => item.id) } },
    });
    await database.role.deleteMany({ where: { tenantId: empty.tenantId } });
    await database.tenant.delete({ where: { id: empty.tenantId } });
    await database.user.delete({ where: { id: empty.userId } });
  });
});
