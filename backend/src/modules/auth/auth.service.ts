import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { getJwtExpiresIn } from './auth.config';
import { type Permission, ROLE_PERMISSIONS } from './constants/permissions';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import type {
  AuthJwtPayload,
  AuthenticatedUser,
  RoleCode,
} from './types/authenticated-user.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: LoginDto) {
    const username = payload.username.trim();
    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
      relations: { role: { parent: true }, userRoles: { role: { parent: true } } },
    });

    if (!user || !user.role?.isActive) {
      this.logger.warn(`Failed login attempt for username: ${username}`);
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordOk = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordOk) {
      this.logger.warn(`Failed login attempt (wrong password) for username: ${username}`);
      throw new UnauthorizedException('Invalid username or password');
    }

    this.logger.log(`User ${username} logged in successfully`);

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const authUser = this.toAuthUser(user);
    const tokenPayload: AuthJwtPayload = {
      sub: authUser.id,
      username: authUser.username,
      fullName: authUser.fullName,
      roleCode: authUser.roleCode,
      roleCodes: authUser.roleCodes,
      permissions: authUser.permissions,
    };

    return {
      accessToken: await this.jwtService.signAsync(tokenPayload),
      tokenType: 'Bearer',
      expiresIn: getJwtExpiresIn(this.configService),
      user: authUser,
    };
  }

  async changePassword(userId: number, payload: ChangePasswordDto) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const oldPasswordOk = await bcrypt.compare(payload.oldPassword, user.passwordHash);

    if (!oldPasswordOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const same = await bcrypt.compare(payload.newPassword, user.passwordHash);

    if (same) {
      throw new ConflictException('New password must be different from current password');
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(payload.newPassword, salt);
    await this.userRepository.save(user);

    this.logger.log(`User ${user.username} changed password successfully`);
  }

  private toAuthUser(user: User): AuthenticatedUser {
    const allRoles = this.collectAllRoles(user);
    const roleCodes = allRoles.map((r) => r.code as RoleCode);
    const primaryRole = user.role ?? allRoles[0];
    const roleCode = (primaryRole?.code ?? 'STAFF') as RoleCode;
    const permissions = this.resolvePermissions(allRoles);

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleCode,
      roleCodes: [...new Set(roleCodes)],
      permissions,
    };
  }

  private collectAllRoles(user: User): Role[] {
    const roles: Role[] = [];

    if (user.role) {
      roles.push(user.role);
    }

    for (const ur of user.userRoles ?? []) {
      if (ur.role) {
        roles.push(ur.role);
      }
    }

    return roles;
  }

  private resolvePermissions(roles: Role[]): Permission[] {
    const allPermissions = new Set<Permission>();

    for (const role of roles) {
      const chain = this.resolveRoleChain(role);
      for (const r of chain) {
        const perms = this.parseRolePermissions(r);
        for (const p of perms) {
          allPermissions.add(p);
        }
      }
    }

    return [...allPermissions];
  }

  private resolveRoleChain(role: Role): Role[] {
    const chain: Role[] = [role];
    let current = role;

    // Prevent infinite loops (max depth = 10)
    for (let i = 0; i < 10; i++) {
      if (!current.parent) break;
      chain.push(current.parent);
      current = current.parent;
    }

    return chain;
  }

  private parseRolePermissions(role: Role): Permission[] {
    const defaults = ROLE_PERMISSIONS[role.code] ?? [];

    if (role.permissions) {
      const dbPerms = role.permissions.split(',').filter(Boolean) as Permission[];
      if (dbPerms.length > 0) {
        return [...new Set([...defaults, ...dbPerms])];
      }
    }

    return defaults;
  }
}
