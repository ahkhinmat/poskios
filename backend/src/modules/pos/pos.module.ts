import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { ReturnsController } from './returns.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      InventoryTransaction,
      Setting,
      Supplier,
      PurchaseOrder,
      PurchaseOrderItem,
      Product,
      ProductUnit,
      Unit,
      PosDraftTab,
      PosDraftTabItem,
      SalesOrder,
      SalesOrderItem,
    ]),
  ],
  controllers: [PosController, ReturnsController],
  providers: [PosService],
})
export class PosModule {}
