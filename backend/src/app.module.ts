import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PosModule } from './modules/pos/pos.module';
import { Product } from './modules/pos/entities/product.entity';
import { ProductUnit } from './modules/pos/entities/product-unit.entity';
import { Unit } from './modules/pos/entities/unit.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const requireEnv = (key: string) => {
          const value = configService.get<string>(key)?.trim();

          if (!value) {
            throw new Error(`Missing required environment variable: ${key}`);
          }

          return value;
        };

        const dbPortValue = configService.get<string>('DB_PORT', '5432');
        const dbPort = Number(dbPortValue);

        return {
          type: 'postgres',
          host: requireEnv('DB_HOST'),
          port: Number.isNaN(dbPort) ? 5432 : dbPort,
          username: requireEnv('DB_USERNAME'),
          password: requireEnv('DB_PASSWORD'),
          database: requireEnv('DB_NAME'),
          synchronize: false,
          autoLoadEntities: true,
          entities: [Product, ProductUnit, Unit],
        };
      },
    }),
    AuthModule,
    PosModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
