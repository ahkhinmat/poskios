import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { SalesOrderService } from '../sales-order.service';
import { PosCheckoutDto } from '../../dto/pos-checkout.dto';
import { ReturnCheckoutDto } from '../../dto/return-checkout.dto';
import { SalesOrder } from '../../entities/sales-order.entity';
import { SalesOrderItem } from '../../entities/sales-order-item.entity';
import { Product } from '../../entities/product.entity';
import { ProductUnit } from '../../entities/product-unit.entity';
import { Customer } from '../../entities/customer.entity';
import { Setting } from '../../entities/setting.entity';
import { LoyaltyPointTransaction } from '../../entities/loyalty-point-transaction.entity';

describe('SalesOrderService', () => {
  let service: SalesOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderService,
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: getRepositoryToken(SalesOrder), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(SalesOrderItem), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Product), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(ProductUnit), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Customer), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Setting), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(LoyaltyPointTransaction), useValue: { createQueryBuilder: jest.fn() } },
      ],
    }).compile();

    service = module.get<SalesOrderService>(SalesOrderService);
  });

  describe('checkout', () => {
    it('should throw BadRequestException when cart is empty', async () => {
      await expect(
        service.checkout(1, { items: [] } as unknown as PosCheckoutDto, {} as Setting),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('returnCheckout', () => {
    it('should throw BadRequestException when cart is empty', async () => {
      await expect(
        service.returnCheckout(1, { sourceSalesOrderId: 1, items: [] } as unknown as ReturnCheckoutDto, {} as Setting),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
