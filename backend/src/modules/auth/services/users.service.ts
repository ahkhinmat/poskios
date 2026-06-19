import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: { role: { parent: true }, userRoles: { role: { parent: true } } },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { role: { parent: true }, userRoles: { role: { parent: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getEffectivePermissions(id: number): Promise<string[]> {
    const user = await this.findOne(id);
    const permSet = new Set<string>();

    const collectRolePerms = (role: Role | null | undefined) => {
      if (!role) return;
      const perms = (role.permissions ?? '').split(',').filter(Boolean);
      for (const p of perms) permSet.add(p);
      if (role.parent) collectRolePerms(role.parent);
    };

    if (user.role) collectRolePerms(user.role);
    for (const ur of user.userRoles ?? []) {
      collectRolePerms(ur.role);
    }
    return Array.from(permSet);
  }

  async updateRoles(id: number, roleIds: number[]): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRoleRepository.delete({ userId: id });

    if (roleIds.length) {
      const newRoles = roleIds.map((roleId) =>
        this.userRoleRepository.create({ userId: id, roleId }),
      );
      await this.userRoleRepository.save(newRoles);
    }
  }
}
