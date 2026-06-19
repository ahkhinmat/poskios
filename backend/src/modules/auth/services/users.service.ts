import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      relations: { userRoles: { role: true } },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { userRoles: { role: true } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getEffectivePermissions(id: number): Promise<string[]> {
    const user = await this.findOne(id);
    const permSet = new Set<string>();
    for (const ur of user.userRoles) {
      const perms = (ur.role.permissions ?? '').split(',').filter(Boolean);
      for (const p of perms) permSet.add(p);
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
