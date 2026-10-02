import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  catalogQuerySchema,
  companyCreateSchema,
  companyUpdateSchema,
  branchCreateSchema,
  branchUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  supplierCreateSchema,
  supplierUpdateSchema,
  warehouseCreateSchema,
  warehouseUpdateSchema,
} from '@inventario/validation';
import type { AccessRequest } from './access.context';
import { RequirePermission } from './access.decorators';
import { CatalogService } from './catalog.service';
import { parseBody } from './validation';

function context(request: AccessRequest) {
  if (!request.auth || !request.tenant) throw new UnauthorizedException();
  return { tenantId: request.tenant.tenantId, actor: request.auth.userId };
}

@Controller('companies')
export class CompaniesController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @RequirePermission('companies:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.catalog.companies(
      context(request).tenantId,
      parseBody(catalogQuerySchema, query),
    );
  }

  @RequirePermission('companies:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.company(context(request).tenantId, id);
  }

  @RequirePermission('companies:write')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.catalog.createCompany(
      access.tenantId,
      access.actor,
      parseBody(companyCreateSchema, body),
    );
  }

  @RequirePermission('companies:write')
  @Patch(':id')
  update(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const access = context(request);
    return this.catalog.updateCompany(
      access.tenantId,
      access.actor,
      id,
      parseBody(companyUpdateSchema, body),
    );
  }
}

@Controller('branches')
export class BranchesController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @RequirePermission('branches:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.catalog.branches(
      context(request).tenantId,
      parseBody(catalogQuerySchema, query),
    );
  }

  @RequirePermission('branches:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.branch(context(request).tenantId, id);
  }

  @RequirePermission('branches:write')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.catalog.createBranch(
      access.tenantId,
      access.actor,
      parseBody(branchCreateSchema, body),
    );
  }

  @RequirePermission('branches:write')
  @Patch(':id')
  update(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const access = context(request);
    return this.catalog.updateBranch(
      access.tenantId,
      access.actor,
      id,
      parseBody(branchUpdateSchema, body),
    );
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @RequirePermission('categories:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.catalog.categories(
      context(request).tenantId,
      parseBody(catalogQuerySchema, query),
    );
  }

  @RequirePermission('categories:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.category(context(request).tenantId, id);
  }

  @RequirePermission('categories:write')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.catalog.createCategory(
      access.tenantId,
      access.actor,
      parseBody(categoryCreateSchema, body),
    );
  }

  @RequirePermission('categories:write')
  @Patch(':id')
  update(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const access = context(request);
    return this.catalog.updateCategory(
      access.tenantId,
      access.actor,
      id,
      parseBody(categoryUpdateSchema, body),
    );
  }
}

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @RequirePermission('products:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.catalog.products(
      context(request).tenantId,
      parseBody(catalogQuerySchema, query),
    );
  }

  @RequirePermission('products:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.product(context(request).tenantId, id);
  }

  @RequirePermission('products:write')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.catalog.createProduct(
      access.tenantId,
      access.actor,
      parseBody(productCreateSchema, body),
    );
  }

  @RequirePermission('products:write')
  @Patch(':id')
  update(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const access = context(request);
    return this.catalog.updateProduct(
      access.tenantId,
      access.actor,
      id,
      parseBody(productUpdateSchema, body),
    );
  }
}

@Controller('suppliers')
export class SuppliersController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @RequirePermission('suppliers:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.catalog.suppliers(
      context(request).tenantId,
      parseBody(catalogQuerySchema, query),
    );
  }

  @RequirePermission('suppliers:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.supplier(context(request).tenantId, id);
  }

  @RequirePermission('suppliers:write')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.catalog.createSupplier(
      access.tenantId,
      access.actor,
      parseBody(supplierCreateSchema, body),
    );
  }

  @RequirePermission('suppliers:write')
  @Patch(':id')
  update(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const access = context(request);
    return this.catalog.updateSupplier(
      access.tenantId,
      access.actor,
      id,
      parseBody(supplierUpdateSchema, body),
    );
  }
}

@Controller('warehouses')
export class WarehousesController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @RequirePermission('warehouses:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.catalog.warehouses(
      context(request).tenantId,
      parseBody(catalogQuerySchema, query),
    );
  }

  @RequirePermission('warehouses:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.warehouse(context(request).tenantId, id);
  }

  @RequirePermission('warehouses:write')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.catalog.createWarehouse(
      access.tenantId,
      access.actor,
      parseBody(warehouseCreateSchema, body),
    );
  }

  @RequirePermission('warehouses:write')
  @Patch(':id')
  update(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const access = context(request);
    return this.catalog.updateWarehouse(
      access.tenantId,
      access.actor,
      id,
      parseBody(warehouseUpdateSchema, body),
    );
  }
}
