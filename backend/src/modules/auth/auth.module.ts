import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getJwtExpiresIn, getJwtSecret } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from './entities/role.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './services/roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, User, UserRole]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: getJwtExpiresIn(configService) as never,
        },
      }),
    }),
  ],
  controllers: [AuthController, RolesController, UsersController],
  providers: [AuthService, RolesService, UsersService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
