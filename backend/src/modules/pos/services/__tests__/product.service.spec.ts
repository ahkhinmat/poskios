import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProductService } from '../product.service';
import { Product } from '../../entities/product.entity';
import { ProductUnit } from '../../entities/product-unit.entity';
import { Unit } from '../../entities/unit.entity';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: getRepositoryToken(Product), useValue: { createQueryBuilder: jest.fn(), findOne: jest.fn(), find: jest.fn() } },
        { provide: getRepositoryToken(ProductUnit), useValue: { createQueryBuilder: jest.fn(), findOne: jest.fn() } },
        { provide: getRepositoryToken(Unit), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
