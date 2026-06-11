import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { PosModule } from './modules/pos/pos.module';
import { Product } from './modules/pos/entities/product.entity';
import { ProductUnit } from './modules/pos/entities/product-unit.entity';
import { Unit } from './modules/pos/entities/unit.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbPort = Number(configService.get<string>('DB_PORT', '1433'));

        return {
          type: 'mssql' as const,
          host: configService.get<string>('DB_HOST', '10.22.10.22'),
          port: Number.isNaN(dbPort) ? 1433 : dbPort,
          username: configService.get<string>('DB_USERNAME', 'sa'),
          password: configService.get<string>('DB_PASSWORD', 'abc1234!'),
          database: configService.get<string>('DB_NAME', 'POS'),
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
    PosModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
