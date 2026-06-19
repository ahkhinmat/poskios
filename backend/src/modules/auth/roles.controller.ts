import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { RolesService } from './services/roles.service';
import type { CreateRoleDto, UpdateRoleDto } from './services/roles.service';
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

  @Post()
  async create(@Body() dto: CreateRoleDto) {
    const data = await this.rolesService.create(dto);
    return { success: true, data };
  }

  @Get(':code')
  async findOne(@Param('code') code: string) {
    const data = await this.rolesService.findOne(code);
    return { success: true, data };
  }

  @Put(':code')
  async update(@Param('code') code: string, @Body() dto: UpdateRoleDto) {
    const data = await this.rolesService.update(code, dto);
    return { success: true, data };
  }

  @Delete(':code')
  async remove(@Param('code') code: string) {
    await this.rolesService.remove(code);
    return { success: true, message: 'Role deleted' };
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
