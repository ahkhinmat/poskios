import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { RolesService } from './services/roles.service';
import { Public } from './decorators/public.decorator';

@Controller('auth/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll() {
    const data = await this.rolesService.findAll();

    return { success: true, data };
  }

  @Get('permission-groups')
  getPermissionGroups() {
    return {
      success: true,
      data: this.rolesService.getPermissionGroups(),
    };
  }

  @Get(':code/permissions')
  async getPermissions(@Param('code') code: string) {
    const data = await this.rolesService.getPermissionsByRole(code);

    return { success: true, data };
  }

  @Put(':code/permissions')
  async updatePermissions(
    @Param('code') code: string,
    @Body() body: { permissions: string[] },
  ) {
    await this.rolesService.updatePermissions(code, body.permissions as never);

    return { success: true, message: 'Permissions updated' };
  }
}
