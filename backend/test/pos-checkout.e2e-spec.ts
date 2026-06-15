import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { SalesOrderService } from '../src/modules/pos/services/sales-order.service';
import { SalesOrder } from '../src/modules/pos/entities/sales-order.entity';
import { SalesOrderItem } from '../src/modules/pos/entities/sales-order-item.entity';
import { Product } from '../src/modules/pos/entities/product.entity';
import { ProductUnit } from '../src/modules/pos/entities/product-unit.entity';
import { Customer } from '../src/modules/pos/entities/customer.entity';
import { Setting } from '../src/modules/pos/entities/setting.entity';
import { LoyaltyPointTransaction } from '../src/modules/pos/entities/loyalty-point-transaction.entity';
import { PosCheckoutDto } from '../src/modules/pos/dto/pos-checkout.dto';
import { PosCheckoutItemDto } from '../src/modules/pos/dto/pos-checkout-item.dto';

describe('SalesOrderService Integration', () => {
  let service: SalesOrderService;
  let dataSource: jest.Mocked<DataSource>;
  let settingRepo: jest.Mocked<Repository<Setting>>;
  let salesOrderRepo: jest.Mocked<Repository<SalesOrder>>;

  beforeEach(async () => {
    const mockTransaction = jest.fn();
    dataSource = { transaction: mockTransaction } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(SalesOrder), useValue: { createQueryBuilder: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(SalesOrderItem), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Product), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(ProductUnit), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Customer), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Setting), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(LoyaltyPointTransaction), useValue: { createQueryBuilder: jest.fn() } },
      ],
    }).compile();

    service = module.get(SalesOrderService);
    settingRepo = module.get(getRepositoryToken(Setting));
    salesOrderRepo = module.get(getRepositoryToken(SalesOrder));
  });

  describe('checkout validation', () => {
    it('should reject empty cart', async () => {
      const setting = { id: 1 } as Setting;
      const dto = new PosCheckoutDto();
      Object.assign(dto, {
        saleMode: 'SALE', paymentMethod: 'CASH',
        customerPaidAmount: 0, discountAmount: 0, items: [],
      });

      await expect(
        service.checkout(1, dto, setting),
      ).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

  });

  describe('returnCheckout validation', () => {
    it('should reject empty return cart', async () => {
      const setting = { id: 1 } as Setting;

      await expect(
        service.returnCheckout(1, { sourceSalesOrderId: 1, items: [] } as any, setting),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
