import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { getJwtExpiresIn } from './auth.config';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(payload: LoginDto) {
    const username = payload.username.trim();
    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
      relations: { role: true },
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
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleCode: user.role.code as RoleCode,
    };
  }
}
