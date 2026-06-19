import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
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

  async create(dto: { username: string; password: string; fullName: string; phoneNumber?: string; email?: string; roleId: number }) {
    const existing = await this.userRepository.findOneBy({ username: dto.username });
    if (existing) throw new ConflictException('Username already exists');

    const salt = await bcrypt.genSalt(12);
    const now = new Date();
    const user = this.userRepository.create({
      username: dto.username,
      passwordHash: await bcrypt.hash(dto.password, salt),
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber ?? null,
      email: dto.email ?? null,
      roleId: dto.roleId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return this.userRepository.save(user);
  }

  async update(id: number, dto: { username?: string; fullName?: string; phoneNumber?: string; email?: string; roleId?: number; password?: string }) {
    const user = await this.findOne(id);
    if (dto.username !== undefined && dto.username !== user.username) {
      const existing = await this.userRepository.findOneBy({ username: dto.username });
      if (existing) throw new ConflictException('Username already exists');
      user.username = dto.username;
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    if (dto.password) {
      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(dto.password, salt);
    }
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }

  async toggleStatus(id: number): Promise<User> {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    return this.userRepository.save(user);
  }
}
