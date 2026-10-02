import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  inventoryQuerySchema,
  movementQuerySchema,
  stockAdjustmentSchema,
  stockOperationSchema,
  stockTransferSchema,
  transferQuerySchema,
} from '@inventario/validation';
import type { AccessRequest } from './access.context';
import { RequirePermission } from './access.decorators';
import { InventoryService } from './inventory.service';
import { parseBody } from './validation';

function context(request: AccessRequest) {
  if (!request.auth || !request.tenant) throw new UnauthorizedException();
  return { tenantId: request.tenant.tenantId, actor: request.auth.userId };
}

@Controller('inventory')
export class InventoryController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  @RequirePermission('inventory:read')
  @Get()
  balances(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.inventory.balances(
      context(request).tenantId,
      parseBody(inventoryQuerySchema, query),
    );
  }

  @RequirePermission('inventory:read')
  @Get('movements')
  movements(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.inventory.movements(
      context(request).tenantId,
      parseBody(movementQuerySchema, query),
    );
  }

  @RequirePermission('inventory:write')
  @Post('initial-stock')
  initial(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.inventory.initial(
      access.tenantId,
      access.actor,
      parseBody(stockOperationSchema, body),
    );
  }

  @RequirePermission('inventory:write')
  @Post('entries')
  entry(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.inventory.entry(
      access.tenantId,
      access.actor,
      parseBody(stockOperationSchema, body),
    );
  }

  @RequirePermission('inventory:write')
  @Post('issues')
  issue(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.inventory.issue(
      access.tenantId,
      access.actor,
      parseBody(stockOperationSchema, body),
    );
  }

  @RequirePermission('inventory:adjust')
  @Post('adjustments')
  adjustment(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.inventory.adjustment(
      access.tenantId,
      access.actor,
      parseBody(stockAdjustmentSchema, body),
    );
  }
}

@Controller('transfers')
export class TransfersController {
  constructor(
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}

  @RequirePermission('inventory:read')
  @Get()
  list(@Req() request: AccessRequest, @Query() query: unknown) {
    return this.inventory.transfers(
      context(request).tenantId,
      parseBody(transferQuerySchema, query),
    );
  }

  @RequirePermission('inventory:read')
  @Get(':id')
  get(@Req() request: AccessRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.transferById(context(request).tenantId, id);
  }

  @RequirePermission('inventory:transfer')
  @Post()
  create(@Req() request: AccessRequest, @Body() body: unknown) {
    const access = context(request);
    return this.inventory.transfer(
      access.tenantId,
      access.actor,
      parseBody(stockTransferSchema, body),
    );
  }
}
