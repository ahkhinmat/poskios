import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PurchaseCheckoutDto } from '../dto/purchase-checkout.dto';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { ProductUnit } from '../entities/product-unit.entity';
import { Product } from '../entities/product.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Setting } from '../entities/setting.entity';
import { Supplier } from '../entities/supplier.entity';

type ReceiptItem = {
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async purchaseCheckout(userId: number, payload: PurchaseCheckoutDto) {
    if (!payload.items.length) throw new BadRequestException('Purchase cart is empty');

    const setting = await this.getOrCreateSetting();
    const supplier = payload.supplierId != null
      ? await this.supplierRepository.findOne({ where: { id: payload.supplierId, isActive: true as never } } as never)
      : null;

    const result = await this.dataSource.transaction(async (manager) => {
      const productUnits = await manager.find(ProductUnit, {
        where: { id: In(payload.items.map((item) => item.productUnitId)), isActive: true },
        relations: { product: true, unit: true },
      });

      const productUnitMap = new Map(productUnits.map((item) => [item.id, item]));

      let subtotalAmount = 0;
      let lineDiscountAmount = 0;
      let itemCount = 0;

      const normalizedItems = payload.items.map((item, index) => {
        const productUnit = productUnitMap.get(item.productUnitId);
        if (!productUnit || productUnit.product.id !== item.productId) {
          throw new BadRequestException(`Invalid purchase product unit at items[${index}]`);
        }

        const grossAmount = item.quantity * item.unitPrice;
        const lineTotal = Number((grossAmount - item.discountAmount).toFixed(2));
        if (lineTotal < 0) throw new BadRequestException(`Invalid purchase line total at items[${index}]`);

        subtotalAmount += grossAmount;
        lineDiscountAmount += item.discountAmount;
        itemCount += item.quantity;

        return { input: item, productUnit, lineTotal };
      });

      const orderDiscountAmount = payload.discountAmount ?? 0;
      const totalAmount = Number((subtotalAmount - lineDiscountAmount - orderDiscountAmount).toFixed(2));
      if (totalAmount < 0) throw new BadRequestException('Invalid purchase total');

      const supplierPaidAmount = Number((payload.supplierPaidAmount ?? 0).toFixed(2));
      const debtAmount = Number((totalAmount - supplierPaidAmount).toFixed(2));
      const orderedAt = payload.importDate ? new Date(payload.importDate) : new Date();

      const purchaseOrder = await manager.save(PurchaseOrder, manager.create(PurchaseOrder, {
        supplierId: payload.supplierId ?? null,
        createdByUserId: userId,
        approvedByUserId: userId,
        purchaseOrderCode: 'PENDING',
        supplierNameSnapshot: supplier?.name ?? null,
        status: payload.status?.trim() || 'COMPLETED',
        notes: payload.note ?? null,
        subtotalAmount: subtotalAmount.toFixed(2),
        discountAmount: orderDiscountAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        orderedAt,
        confirmedAt: new Date(),
        isActive: true,
      }));

      purchaseOrder.purchaseOrderCode = await this.generatePurchaseOrderCode(manager, purchaseOrder.id);
      await manager.save(PurchaseOrder, purchaseOrder);

      const receiptItems: ReceiptItem[] = [];

      for (const item of normalizedItems) {
        await manager.save(PurchaseOrderItem, manager.create(PurchaseOrderItem, {
          purchaseOrderId: purchaseOrder.id,
          productId: item.productUnit.product.id,
          productUnitId: item.productUnit.id,
          productCodeSnapshot: item.productUnit.product.productCode,
          productNameSnapshot: item.productUnit.product.name,
          unitNameSnapshot: item.productUnit.unit.name,
          conversionValue: item.productUnit.conversionValue,
          quantity: item.input.quantity.toFixed(3),
          costPrice: item.input.unitPrice.toFixed(2),
          lineTotal: item.lineTotal.toFixed(2),
          notes: item.input.note ?? null,
        }));

        const stockBefore = Number(item.productUnit.product.stockOnHand);
        const stockAfter = Number((stockBefore + item.input.quantity).toFixed(3));

        item.productUnit.product.stockOnHand = stockAfter.toFixed(3);
        item.productUnit.product.costPrice = item.input.unitPrice.toFixed(2);
        await manager.save(Product, item.productUnit.product);

        item.productUnit.costPrice = item.input.unitPrice.toFixed(2);
        await manager.save(ProductUnit, item.productUnit);

        await manager.save(InventoryTransaction, manager.create(InventoryTransaction, {
          productId: item.productUnit.product.id,
          purchaseOrderId: purchaseOrder.id,
          salesOrderId: null,
          createdByUserId: userId,
          transactionType: 'PURCHASE_IN',
          referenceCode: purchaseOrder.purchaseOrderCode,
          quantityChange: item.input.quantity.toFixed(3),
          stockBefore: stockBefore.toFixed(3),
          stockAfter: stockAfter.toFixed(3),
          unitCost: item.input.unitPrice.toFixed(2),
          notes: payload.note ?? null,
          batchNumber: null,
          expiryDate: null,
          transactionAt: orderedAt,
        }));

        receiptItems.push({
          productName: item.productUnit.product.name,
          unitName: item.productUnit.unit.name,
          quantity: item.input.quantity,
          unitPrice: item.input.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      return { purchaseOrder, itemCount, subtotalAmount, orderDiscountAmount, totalAmount, supplierPaidAmount, debtAmount, receiptItems };
    });

    return {
      purchaseOrderId: result.purchaseOrder.id,
      purchaseOrderCode: result.purchaseOrder.purchaseOrderCode,
      status: result.purchaseOrder.status,
      orderedAt: result.purchaseOrder.orderedAt,
      supplier: { id: supplier?.id ?? null, name: supplier?.name ?? null },
      summary: {
        itemCount: result.itemCount, subtotalAmount: result.subtotalAmount, discountAmount: result.orderDiscountAmount,
        totalAmount: result.totalAmount, supplierPaidAmount: result.supplierPaidAmount, debtAmount: result.debtAmount,
      },
      receiptData: {
        storeName: setting?.storeName ?? 'POS',
        storeAddress: setting?.storeAddress ?? null,
        storePhoneNumber: setting?.storePhoneNumber ?? null,
        purchaseOrderCode: result.purchaseOrder.purchaseOrderCode,
        orderedAt: result.purchaseOrder.orderedAt,
        supplierName: supplier?.name ?? null,
        items: result.receiptItems,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.orderDiscountAmount,
        totalAmount: result.totalAmount,
        supplierPaidAmount: result.supplierPaidAmount,
        debtAmount: result.debtAmount,
        footerMessage: setting?.receiptFooter ?? setting?.receiptHeader ?? null,
      },
    };
  }

  async getOrCreateSetting() {
    const settingRepo = this.purchaseOrderRepository.manager.getRepository(Setting);
    const existing = await settingRepo.findOne({ where: {}, order: { id: 'ASC' } });

    if (existing) return existing;

    return settingRepo.save(settingRepo.create({
      storeName: 'KA MART', storeAddress: null, storePhoneNumber: null,
      receiptHeader: null, receiptFooter: null,
      loyaltyEarnAmountPerPoint: '10000.00', loyaltyRedeemAmountPerPoint: '1000.00',
      loyaltyMinimumRedeemPoints: 10, loyaltyPointsExpiryDays: null,
    }));
  }

  private async generatePurchaseOrderCode(manager: DataSource['manager'], purchaseOrderId: number) {
    const previousCount = await manager
      .createQueryBuilder(PurchaseOrder, 'purchaseOrder')
      .where('purchaseOrder.Id < :purchaseOrderId', { purchaseOrderId })
      .getCount();

    const sequence = previousCount + 1;
    const identity = String(purchaseOrderId).padStart(6, '0');
    return `PNH${String(sequence).padStart(4, '0')}${identity}`;
  }
}
