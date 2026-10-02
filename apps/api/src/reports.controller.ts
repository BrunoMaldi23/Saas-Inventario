import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  dashboardQuerySchema,
  lowStockReportQuerySchema,
  movementReportQuerySchema,
  productReportQuerySchema,
  stockReportQuerySchema,
  warehouseReportQuerySchema,
} from '@inventario/validation';
import type { AccessRequest } from './access.context';
import { RequirePermission } from './access.decorators';
import { ReportsService } from './reports.service';
import { parseBody } from './validation';

function tenantId(request: AccessRequest): string {
  if (!request.auth || !request.tenant) throw new UnauthorizedException();
  return request.tenant.tenantId;
}

@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
  ) {}

  @RequirePermission('reports:read')
  @Get('dashboard')
  dashboard(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.reports.dashboard(
      tenantId(request),
      parseBody(dashboardQuerySchema, query),
    );
  }

  @RequirePermission('reports:read')
  @Get('stock')
  stock(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.reports.stock(
      tenantId(request),
      parseBody(stockReportQuerySchema, query),
    );
  }

  @RequirePermission('reports:read')
  @Get('low-stock')
  lowStock(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.reports.lowStock(
      tenantId(request),
      parseBody(lowStockReportQuerySchema, query),
    );
  }

  @RequirePermission('reports:read')
  @Get('movements')
  movements(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.reports.movements(
      tenantId(request),
      parseBody(movementReportQuerySchema, query),
    );
  }

  @RequirePermission('reports:read')
  @Get('warehouses')
  warehouses(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.reports.warehouses(
      tenantId(request),
      parseBody(warehouseReportQuerySchema, query),
    );
  }

  @RequirePermission('reports:read')
  @Get('products')
  products(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.reports.products(
      tenantId(request),
      parseBody(productReportQuerySchema, query),
    );
  }
}
