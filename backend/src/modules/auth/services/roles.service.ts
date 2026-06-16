import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type Permission, PERMISSION_GROUPS, ROLE_PERMISSIONS } from '../constants/permissions';
import { Role } from '../entities/role.entity';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll() {
    return this.roleRepository.find({ order: { id: 'ASC' } });
  }

  getPermissionGroups() {
    return PERMISSION_GROUPS;
  }

  async getPermissionsByRole(roleCode: string): Promise<Permission[]> {
    const role = await this.roleRepository.findOneBy({ code: roleCode });

    if (!role) {
      throw new NotFoundException(`Role ${roleCode} not found`);
    }

    return this.parsePermissions(role);
  }

  async updatePermissions(roleCode: string, permissions: Permission[]) {
    const role = await this.roleRepository.findOneBy({ code: roleCode });

    if (!role) {
      throw new NotFoundException(`Role ${roleCode} not found`);
    }

    role.permissions = permissions.join(',');
    await this.roleRepository.save(role);

    this.logger.log(`Updated permissions for role ${roleCode}: ${role.permissions}`);
  }

  parsePermissions(role: Role): Permission[] {
    if (role.permissions) {
      const perms = role.permissions.split(',').filter(Boolean) as Permission[];
      if (perms.length > 0) {
        return perms;
      }
    }

    return ROLE_PERMISSIONS[role.code] ?? [];
  }
}
