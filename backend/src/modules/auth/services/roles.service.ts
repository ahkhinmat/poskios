import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { type Permission, PERMISSION_GROUPS, ROLE_PERMISSIONS } from '../constants/permissions';
import { Role } from '../entities/role.entity';

export type CreateRoleDto = {
  code: string;
  name: string;
  description?: string;
  parentId?: number;
};

export type UpdateRoleDto = {
  name?: string;
  description?: string;
  parentId?: number | null;
  isActive?: boolean;
};

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

  async findOne(code: string) {
    const role = await this.roleRepository.findOne({
      where: { code },
      relations: { parent: true },
    });

    if (!role) {
      throw new NotFoundException(`Role ${code} not found`);
    }

    return role;
  }

  async create(dto: CreateRoleDto) {
    const now = new Date();
    const role = this.roleRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      parentId: dto.parentId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const saved = await this.roleRepository.save(role);
    this.logger.log(`Created role ${saved.code} (${saved.name})`);

    return saved;
  }

  async update(code: string, dto: UpdateRoleDto) {
    const role = await this.findOne(code);

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.parentId !== undefined) role.parentId = dto.parentId;
    if (dto.isActive !== undefined) role.isActive = dto.isActive;
    role.updatedAt = new Date();

    const saved = await this.roleRepository.save(role);
    this.logger.log(`Updated role ${saved.code}`);

    return saved;
  }

  async remove(code: string) {
    const role = await this.findOne(code);
    await this.roleRepository.remove(role);
    this.logger.log(`Deleted role ${code}`);
  }

  getPermissionGroups() {
    return PERMISSION_GROUPS;
  }

  async getPermissionsByRole(roleCode: string): Promise<Permission[]> {
    const role = await this.findOne(roleCode);
    return this.parsePermissions(role);
  }

  async getEffectivePermissionsByRole(roleCode: string): Promise<Permission[]> {
    const role = await this.findOne(roleCode);
    const allPerms = new Set<Permission>();
    const chain = this.resolveRoleChain(role);
    for (const r of chain) {
      const perms = this.parsePermissions(r);
      for (const p of perms) allPerms.add(p);
    }
    return [...allPerms];
  }

  private resolveRoleChain(role: Role): Role[] {
    const chain: Role[] = [role];
    let current = role;
    for (let i = 0; i < 10; i++) {
      if (!current.parent) break;
      chain.push(current.parent);
      current = current.parent;
    }
    return chain;
  }

  async updatePermissions(roleCode: string, permissions: Permission[]) {
    const role = await this.findOne(roleCode);
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
