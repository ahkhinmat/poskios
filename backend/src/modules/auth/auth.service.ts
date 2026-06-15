import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { getJwtExpiresIn } from './auth.config';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import type {
  AuthJwtPayload,
  AuthenticatedUser,
  RoleCode,
} from './types/authenticated-user.type';

@Injectable()
export class AuthService {
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
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordOk = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException('Invalid username or password');
    }

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

  private toAuthUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roleCode: user.role.code as RoleCode,
    };
  }
}
