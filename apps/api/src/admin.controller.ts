import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  MembershipView,
  MembershipsResponse,
  RolesResponse,
  UserSummary,
} from '@inventario/types';
import {
  changeMembershipStatusRequestSchema,
  changeRoleRequestSchema,
  createMembershipRequestSchema,
  addMembershipByEmailRequestSchema,
  createUserRequestSchema,
} from '@inventario/validation';
import { AdminService } from './admin.service';
import { RequirePermission } from './access.decorators';
import type { AccessRequest } from './access.context';
import { parseBody } from './validation';

function requireContext(request: AccessRequest) {
  if (!request.auth || !request.tenant) throw new UnauthorizedException();
  return { auth: request.auth, tenant: request.tenant };
}

@Controller('roles')
export class RolesController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @RequirePermission('users:read')
  @Get()
  roles(@Req() request: AccessRequest): Promise<RolesResponse> {
    return this.admin.roles(requireContext(request).tenant);
  }
}

@Controller('users')
export class UsersController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @RequirePermission('users:create')
  @Post()
  create(
    @Req() request: AccessRequest,
    @Body() body: unknown,
  ): Promise<UserSummary> {
    const context = requireContext(request);
    return this.admin.createUser(
      context.auth,
      context.tenant,
      parseBody(createUserRequestSchema, body),
    );
  }
}

@Controller('memberships')
export class MembershipsController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @RequirePermission('users:read')
  @Get()
  list(@Req() request: AccessRequest): Promise<MembershipsResponse> {
    return this.admin.memberships(requireContext(request).tenant);
  }

  @RequirePermission('memberships:manage')
  @Post()
  create(
    @Req() request: AccessRequest,
    @Body() body: unknown,
  ): Promise<MembershipView> {
    const context = requireContext(request);
    return this.admin.createMembership(
      context.auth,
      context.tenant,
      parseBody(createMembershipRequestSchema, body),
    );
  }

  @RequirePermission('memberships:manage')
  @Post('by-email')
  createByEmail(
    @Req() request: AccessRequest,
    @Body() body: unknown,
  ): Promise<MembershipView> {
    const context = requireContext(request);
    return this.admin.createMembershipByEmail(
      context.auth,
      context.tenant,
      parseBody(addMembershipByEmailRequestSchema, body),
    );
  }

  @RequirePermission('memberships:manage')
  @Patch(':id/role')
  changeRole(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<MembershipView> {
    const context = requireContext(request);
    return this.admin.changeRole(
      context.auth,
      context.tenant,
      id,
      parseBody(changeRoleRequestSchema, body).roleId,
    );
  }

  @RequirePermission('memberships:manage')
  @Patch(':id/status')
  changeStatus(
    @Req() request: AccessRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<MembershipView> {
    const context = requireContext(request);
    return this.admin.changeStatus(
      context.auth,
      context.tenant,
      id,
      parseBody(changeMembershipStatusRequestSchema, body).status,
    );
  }
}
