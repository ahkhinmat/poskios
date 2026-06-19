import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
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

  @Post()
  @Permissions(PERMISSIONS.USERS_MANAGE)
  async create(
    @Body() body: { username: string; password: string; fullName: string; phoneNumber?: string; email?: string; roleId: number },
  ) {
    const user = await this.usersService.create(body);
    return { data: this.sanitizeUser(user) };
  }

  @Put(':id')
  @Permissions(PERMISSIONS.USERS_MANAGE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { username?: string; fullName?: string; phoneNumber?: string; email?: string; roleId?: number; password?: string },
  ) {
    const user = await this.usersService.update(id, body);
    return { data: this.sanitizeUser(user) };
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

  @Put(':id/status')
  @Permissions(PERMISSIONS.USERS_MANAGE)
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.toggleStatus(id);
    return { data: this.sanitizeUser(user) };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
