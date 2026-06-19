import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { Permissions } from './decorators/permissions.decorator';
import { PERMISSIONS } from './constants/permissions';

@Controller('auth/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return { data: users.map(this.sanitizeUser) };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    return { data: this.sanitizeUser(user) };
  }

  @Get(':id/effective-permissions')
  async getEffectivePermissions(@Param('id', ParseIntPipe) id: number) {
    const perms = await this.usersService.getEffectivePermissions(id);
    return { data: perms };
  }

  @Put(':id/roles')
  @Permissions(PERMISSIONS.USERS_MANAGE)
  async updateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { roleIds: number[] },
  ) {
    await this.usersService.updateRoles(id, body.roleIds);
    return { data: null };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
