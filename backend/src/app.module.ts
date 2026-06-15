import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
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

        const dbPortValue = configService.get<string>('DB_PORT', '1433');
        const dbPort = Number(dbPortValue);

        return {
          type: 'mssql' as const,
          host: requireEnv('DB_HOST'),
          port: Number.isNaN(dbPort) ? 1433 : dbPort,
          username: requireEnv('DB_USERNAME'),
          password: requireEnv('DB_PASSWORD'),
          database: requireEnv('DB_NAME'),
          options: {
            encrypt: configService.get<string>('DB_ENCRYPT', 'false') === 'true',
            trustServerCertificate:
              configService.get<string>('DB_TRUST_CERT', 'true') === 'true',
          },
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
  ],
})
export class AppModule {}
