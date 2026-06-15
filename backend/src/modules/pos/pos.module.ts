import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { ProductImportService } from './product-import.service';
import { ReturnsController } from './returns.controller';
import { CategorySupplierService } from './services/category-supplier.service';
import { CustomerLoyaltyService } from './services/customer-loyalty.service';
import { DraftTabService } from './services/draft-tab.service';
import { OverviewService } from './services/overview.service';
import { ProductService } from './services/product.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { SalesOrderService } from './services/sales-order.service';
import { Product } from './entities/product.entity';
import { ProductUnit } from './entities/product-unit.entity';
import { Unit } from './entities/unit.entity';
import { PosDraftTab } from './entities/pos-draft-tab.entity';
import { PosDraftTabItem } from './entities/pos-draft-tab-item.entity';
import { Category } from './entities/category.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Setting } from './entities/setting.entity';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Customer } from './entities/customer.entity';
import { LoyaltyPointTransaction } from './entities/loyalty-point-transaction.entity';

const SERVICES = [
  PosService,
  ProductImportService,
  ProductService,
  SalesOrderService,
  DraftTabService,
  PurchaseOrderService,
  CustomerLoyaltyService,
  OverviewService,
  CategorySupplierService,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category, Customer, InventoryTransaction, LoyaltyPointTransaction,
      Setting, Supplier, PurchaseOrder, PurchaseOrderItem,
      Product, ProductUnit, Unit, PosDraftTab, PosDraftTabItem,
      SalesOrder, SalesOrderItem,
    ]),
  ],
  controllers: [PosController, ReturnsController],
  providers: SERVICES,
})
export class PosModule {}
