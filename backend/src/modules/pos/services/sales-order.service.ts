import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PosCheckoutDto } from '../dto/pos-checkout.dto';
import { ReturnCheckoutDto } from '../dto/return-checkout.dto';
import { Customer } from '../entities/customer.entity';
import { InventoryTransaction } from '../entities/inventory-transaction.entity';
import { LoyaltyPointTransaction } from '../entities/loyalty-point-transaction.entity';
import { ProductUnit } from '../entities/product-unit.entity';
import { Product } from '../entities/product.entity';
import { SalesOrderItem } from '../entities/sales-order-item.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { Setting } from '../entities/setting.entity';
import { SettingService } from './setting.service';

type ReceiptItem = {
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

@Injectable()
export class SalesOrderService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private readonly salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
    @InjectRepository(LoyaltyPointTransaction)
    private readonly loyaltyPointTransactionRepository: Repository<LoyaltyPointTransaction>,
    private readonly settingService: SettingService,
  ) {}

  async checkout(userId: number, payload: PosCheckoutDto, setting: Setting) {
    if (!payload.items.length) throw new BadRequestException('Cart is empty');

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
          throw new BadRequestException(`Invalid product unit at items[${index}]`);
        }
        if (!productUnit.product.isActive || !productUnit.product.allowDirectSale) {
          throw new BadRequestException(`Product is inactive or not allowed for direct sale at items[${index}]`);
        }

        const grossAmount = item.quantity * item.unitPrice;
        const lineTotal = Number((grossAmount - item.discountAmount).toFixed(2));
        if (lineTotal < 0) throw new BadRequestException(`Invalid line total at items[${index}]`);

        subtotalAmount += grossAmount;
        lineDiscountAmount += item.discountAmount;
        itemCount += item.quantity;

        return { input: item, productUnit, grossAmount, lineTotal };
      });

      const customer = await this.findOrCreateCustomer(manager, payload.customerPhone, payload.customerName);
      const orderDiscountAmount = payload.discountAmount ?? 0;
      const redeemedPoints = Number(Number(payload.redeemedPoints ?? 0).toFixed(4));
      const redeemAmountPerPoint = Number(setting.loyaltyRedeemAmountPerPoint ?? '1000');
      const minimumRedeemPoints = Number(setting.loyaltyMinimumRedeemPoints ?? 10) || 0;
      const pointsDiscountAmount = Number((redeemedPoints * redeemAmountPerPoint).toFixed(2));

      if (redeemedPoints > 0) {
        if (!customer) throw new BadRequestException('Customer phone is required to redeem points');
        if (redeemedPoints < minimumRedeemPoints) throw new BadRequestException('Redeemed points do not meet minimum threshold');
        if (customer.currentPoints < redeemedPoints) throw new BadRequestException('Customer does not have enough points');
      }

      const totalAmount = Number((subtotalAmount - lineDiscountAmount - orderDiscountAmount - pointsDiscountAmount).toFixed(2));
      if (totalAmount < 0) throw new BadRequestException('Invalid checkout total');

      if (payload.paymentMethod === setting.defaultPaymentMethod && payload.customerPaidAmount < totalAmount) {
        throw new BadRequestException('Customer paid amount must be greater than or equal to total amount');
      }

      const changeAmount = payload.paymentMethod === setting.defaultPaymentMethod
        ? Number((payload.customerPaidAmount - totalAmount).toFixed(2))
        : 0;

      const earnAmountPerPoint = Number(setting.loyaltyEarnAmountPerPoint ?? '10000');
      const earnedPoints = earnAmountPerPoint > 0 ? Number((totalAmount / earnAmountPerPoint).toFixed(4)) : 0;
      const salesOrderCode = await this.generateSalesOrderCode(manager, setting.salesOrderPrefix);
      const soldAt = new Date();

      const salesOrder = await manager.save(SalesOrder, manager.create(SalesOrder, {
        createdByUserId: userId,
        cancelledByUserId: null,
        sourceSalesOrderId: null,
        customerId: customer?.id ?? payload.customerId ?? null,
        salesOrderCode,
        orderType: 'SALE',
        status: 'COMPLETED',
        saleMode: payload.saleMode,
        paymentMethod: payload.paymentMethod,
        customerName: payload.customerName ?? null,
        customerPhone: customer?.phoneNumber ?? payload.customerPhone ?? null,
        redeemedPoints,
        earnedPoints,
        loyaltyDiscountAmount: pointsDiscountAmount,
        notes: payload.note ?? null,
        subtotalAmount: subtotalAmount.toFixed(2),
        discountAmount: orderDiscountAmount.toFixed(2),
        returnFeeAmount: '0.00',
        totalAmount: totalAmount.toFixed(2),
        customerPaidAmount: payload.customerPaidAmount.toFixed(2),
        changeAmount: changeAmount.toFixed(2),
        soldAt,
        cancelledAt: null,
        isActive: true,
      }));

      const receiptItems: ReceiptItem[] = [];

      for (const item of normalizedItems) {
        await manager.save(SalesOrderItem, manager.create(SalesOrderItem, {
          salesOrderId: salesOrder.id,
          productId: item.productUnit.product.id,
          productUnitId: item.productUnit.id,
          productCodeSnapshot: item.productUnit.product.productCode,
          barcodeSnapshot: item.productUnit.barcode ?? item.productUnit.product.barcode,
          productNameSnapshot: item.productUnit.product.name,
          unitNameSnapshot: item.productUnit.unit.name,
          conversionValue: item.productUnit.conversionValue,
          quantity: item.input.quantity.toFixed(3),
          costPrice: item.productUnit.costPrice,
          unitPrice: item.input.unitPrice.toFixed(2),
          discountAmount: item.input.discountAmount.toFixed(2),
          lineTotal: item.lineTotal.toFixed(2),
          notes: item.input.note ?? null,
        }));

        const stockBefore = Number(item.productUnit.product.stockOnHand);
        const stockAfter = Number((stockBefore - item.input.quantity).toFixed(3));
        item.productUnit.product.stockOnHand = stockAfter.toFixed(3);
        await manager.save(Product, item.productUnit.product);

        await manager.save(InventoryTransaction, manager.create(InventoryTransaction, {
          productId: item.productUnit.product.id,
          purchaseOrderId: null,
          salesOrderId: salesOrder.id,
          createdByUserId: userId,
          transactionType: 'SALE_OUT',
          referenceCode: salesOrder.salesOrderCode,
          quantityChange: (-item.input.quantity).toFixed(3),
          stockBefore: stockBefore.toFixed(3),
          stockAfter: stockAfter.toFixed(3),
          unitCost: item.productUnit.costPrice,
          notes: payload.note ?? null,
          batchNumber: null,
          expiryDate: null,
          transactionAt: soldAt,
        }));

        receiptItems.push({
          productName: item.productUnit.product.name,
          unitName: item.productUnit.unit.name,
          quantity: item.input.quantity,
          unitPrice: item.input.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      if (customer && redeemedPoints > 0) {
        await this.appendPointTransaction(manager, {
          customer,
          salesOrderId: salesOrder.id,
          transactionType: 'REDEEM',
          pointsChange: -redeemedPoints,
          amountBasis: pointsDiscountAmount,
          notes: `Redeem for ${salesOrder.salesOrderCode}`,
          transactionAt: soldAt,
        });
      }

      if (customer && earnedPoints > 0) {
        const expiryDays = setting.loyaltyPointsExpiryDays ?? null;
        const expireAt = expiryDays && expiryDays > 0
          ? new Date(soldAt.getTime() + expiryDays * 24 * 60 * 60 * 1000) : null;

        await this.appendPointTransaction(manager, {
          customer,
          salesOrderId: salesOrder.id,
          transactionType: 'EARN',
          pointsChange: earnedPoints,
          amountBasis: totalAmount,
          notes: `Earn from ${salesOrder.salesOrderCode}`,
          transactionAt: soldAt,
          expireAt,
        });
      }

      return { salesOrder, customer, itemCount, subtotalAmount, orderDiscountAmount, pointsDiscountAmount, redeemedPoints, earnedPoints, totalAmount, changeAmount, receiptItems };
    });

    return {
      salesOrderId: result.salesOrder.id,
      salesOrderCode: result.salesOrder.salesOrderCode,
      status: result.salesOrder.status,
      soldAt: result.salesOrder.soldAt,
      cashier: { id: userId, fullName: `User ${userId}` },
      summary: {
        itemCount: result.itemCount,
        subtotalAmount: result.subtotalAmount,
        discountAmount: Number(result.orderDiscountAmount.toFixed(2)),
        loyaltyDiscountAmount: result.pointsDiscountAmount,
        totalAmount: result.totalAmount,
        customerPaidAmount: Number(result.salesOrder.customerPaidAmount),
        changeAmount: result.changeAmount,
        paymentMethod: result.salesOrder.paymentMethod,
        customer: result.customer ? { id: result.customer.id, phoneNumber: result.customer.phoneNumber, fullName: result.customer.fullName, currentPoints: Number(result.customer.currentPoints) } : null,
        loyalty: { redeemedPoints: result.redeemedPoints, earnedPoints: result.earnedPoints, loyaltyDiscountAmount: result.pointsDiscountAmount },
      },
      receiptData: {
        storeName: setting?.storeName ?? 'POS',
        storeAddress: setting?.storeAddress ?? null,
        storePhoneNumber: setting?.storePhoneNumber ?? null,
        salesOrderCode: result.salesOrder.salesOrderCode,
        soldAt: result.salesOrder.soldAt,
        cashierName: `User ${userId}`,
        items: result.receiptItems,
        subtotalAmount: result.subtotalAmount,
        discountAmount: Number(result.orderDiscountAmount.toFixed(2)),
        loyaltyDiscountAmount: result.pointsDiscountAmount,
        totalAmount: result.totalAmount,
        customerPaidAmount: Number(result.salesOrder.customerPaidAmount),
        changeAmount: result.changeAmount,
        footerMessage: setting?.receiptFooter ?? setting?.receiptHeader ?? null,
        redeemedPoints: result.redeemedPoints,
        earnedPoints: result.earnedPoints,
      },
    };
  }

  async returnCheckout(userId: number, payload: ReturnCheckoutDto, setting: Setting) {
    if (!payload.items.length) throw new BadRequestException('Return cart is empty');

    const sourceSalesOrder = await this.salesOrderRepository.findOne({ where: { id: payload.sourceSalesOrderId } });
    if (!sourceSalesOrder) throw new NotFoundException('Source sales order not found');

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
          throw new BadRequestException(`Invalid return product unit at items[${index}]`);
        }

        const grossAmount = item.quantity * item.unitPrice;
        const lineTotal = Number((grossAmount - item.discountAmount).toFixed(2));
        if (lineTotal < 0) throw new BadRequestException(`Invalid return line total at items[${index}]`);

        subtotalAmount += grossAmount;
        lineDiscountAmount += item.discountAmount;
        itemCount += item.quantity;

        return { input: item, productUnit, lineTotal };
      });

      const orderDiscountAmount = payload.discountAmount ?? 0;
      const returnFeeAmount = payload.returnFeeAmount ?? 0;
      const refundAmount = Number((subtotalAmount - lineDiscountAmount - orderDiscountAmount - returnFeeAmount).toFixed(2));

      if (refundAmount < 0) throw new BadRequestException('Invalid return checkout total');
      if (payload.customerRefundAmount < refundAmount) throw new BadRequestException('Customer refund amount must be greater than or equal to refund total');

      const salesOrderCode = await this.generateSalesOrderCode(manager, setting.returnOrderPrefix);
      const soldAt = new Date();

      const salesOrder = await manager.save(SalesOrder, manager.create(SalesOrder, {
        createdByUserId: userId,
        cancelledByUserId: null,
        sourceSalesOrderId: payload.sourceSalesOrderId,
        customerId: sourceSalesOrder.customerId ?? null,
        salesOrderCode,
        orderType: 'RETURN',
        status: 'COMPLETED',
        saleMode: payload.saleMode,
        paymentMethod: payload.paymentMethod,
        customerName: payload.customerName ?? sourceSalesOrder.customerName,
        customerPhone: payload.customerPhone ?? sourceSalesOrder.customerPhone,
        redeemedPoints: null,
        earnedPoints: null,
        notes: payload.note ?? null,
        subtotalAmount: subtotalAmount.toFixed(2),
        discountAmount: orderDiscountAmount.toFixed(2),
        returnFeeAmount: returnFeeAmount.toFixed(2),
        totalAmount: refundAmount.toFixed(2),
        customerPaidAmount: payload.customerRefundAmount.toFixed(2),
        changeAmount: '0.00',
        soldAt,
        cancelledAt: null,
        isActive: true,
      }));

      const receiptItems: ReceiptItem[] = [];

      for (const item of normalizedItems) {
        await manager.save(SalesOrderItem, manager.create(SalesOrderItem, {
          salesOrderId: salesOrder.id,
          productId: item.productUnit.product.id,
          productUnitId: item.productUnit.id,
          productCodeSnapshot: item.productUnit.product.productCode,
          barcodeSnapshot: item.productUnit.barcode ?? item.productUnit.product.barcode,
          productNameSnapshot: item.productUnit.product.name,
          unitNameSnapshot: item.productUnit.unit.name,
          conversionValue: item.productUnit.conversionValue,
          quantity: item.input.quantity.toFixed(3),
          costPrice: item.productUnit.costPrice,
          unitPrice: item.input.unitPrice.toFixed(2),
          discountAmount: item.input.discountAmount.toFixed(2),
          lineTotal: item.lineTotal.toFixed(2),
          notes: item.input.note ?? null,
        }));

        const stockBefore = Number(item.productUnit.product.stockOnHand);
        const stockAfter = Number((stockBefore + item.input.quantity).toFixed(3));
        item.productUnit.product.stockOnHand = stockAfter.toFixed(3);
        await manager.save(Product, item.productUnit.product);

        await manager.save(InventoryTransaction, manager.create(InventoryTransaction, {
          productId: item.productUnit.product.id,
          purchaseOrderId: null,
          salesOrderId: salesOrder.id,
          createdByUserId: userId,
          transactionType: 'RETURN_IN',
          referenceCode: salesOrder.salesOrderCode,
          quantityChange: item.input.quantity.toFixed(3),
          stockBefore: stockBefore.toFixed(3),
          stockAfter: stockAfter.toFixed(3),
          unitCost: item.productUnit.costPrice,
          notes: payload.note ?? null,
          batchNumber: null,
          expiryDate: null,
          transactionAt: soldAt,
        }));

        receiptItems.push({
          productName: item.productUnit.product.name,
          unitName: item.productUnit.unit.name,
          quantity: item.input.quantity,
          unitPrice: item.input.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      let customer: Customer | null = null;
      let reversedPoints = 0;

      if (sourceSalesOrder.customerId && (sourceSalesOrder.earnedPoints ?? 0) > 0) {
        customer = await manager.findOne(Customer, { where: { id: sourceSalesOrder.customerId, isActive: true } });

        if (customer) {
          const sourceTotalAmount = Number(sourceSalesOrder.totalAmount);
          const originalEarnedPoints = Number(sourceSalesOrder.earnedPoints ?? 0);
          const reversedBeforeRows = await manager.find(LoyaltyPointTransaction, {
            where: { salesOrderId: payload.sourceSalesOrderId, transactionType: 'RETURN_REVERSE' },
          });
          const reversedBefore = reversedBeforeRows.reduce((sum, row) => sum + Math.abs(Number(row.pointsChange)), 0);
          const remainingEarnedPoints = Math.max(0, originalEarnedPoints - reversedBefore);

          if (sourceTotalAmount > 0 && remainingEarnedPoints > 0) {
            reversedPoints = Math.min(remainingEarnedPoints, Number(((refundAmount / sourceTotalAmount) * originalEarnedPoints).toFixed(4)));
          }

          if (reversedPoints > 0) {
            await this.appendPointTransaction(manager, {
              customer,
              salesOrderId: payload.sourceSalesOrderId,
              transactionType: 'RETURN_REVERSE',
              pointsChange: -reversedPoints,
              amountBasis: refundAmount,
              notes: `Reverse points from return ${salesOrder.salesOrderCode}`,
              transactionAt: soldAt,
            });
          }
        }
      }

      return { salesOrder, customer, itemCount, subtotalAmount, orderDiscountAmount, returnFeeAmount, refundAmount, reversedPoints, receiptItems };
    });

    return {
      salesOrderId: result.salesOrder.id,
      salesOrderCode: result.salesOrder.salesOrderCode,
      status: result.salesOrder.status,
      soldAt: result.salesOrder.soldAt,
      cashier: { id: userId, fullName: `User ${userId}` },
      summary: {
        itemCount: result.itemCount,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.orderDiscountAmount,
        returnFeeAmount: result.returnFeeAmount,
        totalAmount: result.refundAmount,
        customerRefundAmount: Number(result.salesOrder.customerPaidAmount),
        paymentMethod: result.salesOrder.paymentMethod,
        customer: result.customer ? { id: result.customer.id, phoneNumber: result.customer.phoneNumber, fullName: result.customer.fullName, currentPoints: Number(result.customer.currentPoints) } : null,
        loyalty: { reversedPoints: result.reversedPoints },
      },
      receiptData: {
        storeName: setting?.storeName ?? 'POS',
        storeAddress: setting?.storeAddress ?? null,
        storePhoneNumber: setting?.storePhoneNumber ?? null,
        salesOrderCode: result.salesOrder.salesOrderCode,
        soldAt: result.salesOrder.soldAt,
        cashierName: `User ${userId}`,
        items: result.receiptItems,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.orderDiscountAmount,
        returnFeeAmount: result.returnFeeAmount,
        totalAmount: result.refundAmount,
        customerRefundAmount: Number(result.salesOrder.customerPaidAmount),
        footerMessage: setting?.receiptFooter ?? setting?.receiptHeader ?? null,
        reversedPoints: result.reversedPoints,
      },
    };
  }

  async searchReturnInvoice(params: { invoiceCode?: string; productCode?: string; fromDate?: string; toDate?: string }) {
    const hasInvoiceCode = params.invoiceCode?.trim();
    const hasProductCode = params.productCode?.trim();
    const hasFromDate = params.fromDate?.trim();
    const hasToDate = params.toDate?.trim();

    if (!hasInvoiceCode && !hasProductCode && !hasFromDate && !hasToDate) return { items: [] };

    const query = this.salesOrderRepository
      .createQueryBuilder('so')
      .where('so.isActive = :isActive', { isActive: true })
      .andWhere("so.status != 'CANCELLED'");

    if (hasInvoiceCode) {
      query.andWhere('so.salesOrderCode LIKE :invoiceCode', { invoiceCode: `%${params.invoiceCode!.trim().toUpperCase()}%` });
    }

    if (hasProductCode) {
      query.innerJoin(
        (qb) => qb.select('DISTINCT soi.salesOrderId', 'salesOrderId').from(SalesOrderItem, 'soi').where('soi.productCodeSnapshot LIKE :productCode', { productCode: `%${params.productCode!.trim().toUpperCase()}%` }),
        'filtered_soi',
        'filtered_soi.salesOrderId = so.id',
      );
    }

    if (hasFromDate) query.andWhere('so.soldAt >= :fromDate', { fromDate: new Date(params.fromDate!) });
    if (hasToDate) query.andWhere('so.soldAt <= :toDate', { toDate: new Date(params.toDate! + 'T23:59:59.999') });

    const setting = await this.settingService.getOrCreateSetting();
    const orders = await query.take(setting.invoiceSearchMaxResults).orderBy('so.id', 'DESC').getMany();

    return {
      items: orders.map((o) => ({
        id: o.id, salesOrderCode: o.salesOrderCode, status: o.status, orderType: o.orderType, soldAt: o.soldAt, customerName: o.customerName, totalAmount: Number(o.totalAmount),
      })),
    };
  }

  async getReturnInvoiceItems(invoiceId: number) {
    const order = await this.salesOrderRepository.findOne({ where: { id: invoiceId, isActive: true } });
    if (!order) throw new NotFoundException('Invoice not found');

    const items = await this.salesOrderItemRepository.find({ where: { salesOrderId: invoiceId } });

    const productUnitIds = [...new Set(items.map((i) => i.productUnitId))];
    const productUnits = await this.productUnitRepository.find({ where: { id: In(productUnitIds), isActive: true } });
    const puMap = new Map(productUnits.map((pu) => [pu.id, pu]));

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.productRepository.find({ where: { id: In(productIds) } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return {
      salesOrderCode: order.salesOrderCode,
      soldAt: order.soldAt,
      customerName: order.customerName,
      items: items.map((i) => {
        const pu = puMap.get(i.productUnitId);
        return {
          salesOrderItemId: i.id, productId: i.productId, productUnitId: i.productUnitId, unitId: pu?.unitId ?? 0,
          productCode: i.productCodeSnapshot, barcode: i.barcodeSnapshot, productName: i.productNameSnapshot, unitName: i.unitNameSnapshot,
          conversionValue: Number(i.conversionValue), originalQuantity: Number(i.quantity), unitPrice: Number(i.unitPrice),
          discountAmount: Number(i.discountAmount), lineTotal: Number(i.lineTotal), stockOnHand: Number(productMap.get(i.productId)?.stockOnHand ?? 0),
        };
      }),
    };
  }

  async cancelSalesOrder(userId: number, salesOrderId: number) {
    const order = await this.salesOrderRepository.findOne({ where: { id: salesOrderId } });

    if (!order) throw new NotFoundException('Sales order not found');
    if (!order.isActive) throw new BadRequestException('Sales order is already cancelled');
    if (order.orderType !== 'SALE') throw new BadRequestException('Only sale orders can be cancelled');

    const items = await this.salesOrderItemRepository.find({ where: { salesOrderId } });

    await this.dataSource.transaction(async (manager) => {
      order.status = 'CANCELLED';
      order.isActive = false;
      order.cancelledByUserId = userId;
      order.cancelledAt = new Date();
      await manager.save(SalesOrder, order);

      for (const item of items) {
        const product = await manager.findOne(Product, { where: { id: item.productId } });
        if (!product) continue;

        const stockBefore = Number(product.stockOnHand);
        const stockAfter = Number((stockBefore + Number(item.quantity)).toFixed(3));
        product.stockOnHand = stockAfter.toFixed(3);
        await manager.save(Product, product);

        await manager.save(InventoryTransaction, manager.create(InventoryTransaction, {
          productId: item.productId,
          salesOrderId,
          createdByUserId: userId,
          transactionType: 'SALE_CANCEL',
          referenceCode: order.salesOrderCode,
          quantityChange: String(Number(item.quantity)),
          stockBefore: stockBefore.toFixed(3),
          stockAfter: stockAfter.toFixed(3),
          unitCost: item.costPrice,
          notes: `Cancel ${order.salesOrderCode}`,
          batchNumber: null,
          expiryDate: null,
          transactionAt: new Date(),
        }));
      }

      const pointTransactions = await manager.find(LoyaltyPointTransaction, {
        where: { salesOrderId, transactionType: In(['EARN', 'REDEEM']) },
      });

      for (const pt of pointTransactions) {
        const customer = pt.customerId ? await manager.findOne(Customer, { where: { id: pt.customerId } }) : null;
        if (!customer) continue;

        const reverseChange = -Number(pt.pointsChange);
        await this.appendPointTransaction(manager, {
          customer,
          salesOrderId,
          transactionType: 'RETURN_REVERSE',
          pointsChange: reverseChange,
          amountBasis: Number(pt.amountBasis),
          notes: `Reverse ${pt.transactionType} from cancelled ${order.salesOrderCode}`,
          transactionAt: new Date(),
        });
      }
    });
  }

  private async generateSalesOrderCode(manager: DataSource['manager'], prefix: string) {
    const latest = await manager.findOne(SalesOrder, { where: {}, order: { id: 'DESC' } });
    const nextId = (latest?.id ?? 0) + 1;
    return `${prefix}${String(nextId).padStart(7, '0')}`;
  }

  private async findOrCreateCustomer(manager: DataSource['manager'], customerPhone?: string | null, customerName?: string | null) {
    const digits = String(customerPhone ?? '').replace(/\D+/g, '');
    const normalizedPhone = digits || null;

    if (!normalizedPhone) return null;

    const existing = await manager.findOne(Customer, { where: { phoneNumber: normalizedPhone, isActive: true } });

    if (existing) {
      if (!existing.fullName && customerName?.trim()) {
        existing.fullName = customerName.trim();
        return manager.save(Customer, existing);
      }
      return existing;
    }

    return manager.save(Customer, manager.create(Customer, {
      phoneNumber: normalizedPhone, fullName: customerName?.trim() || null, currentPoints: 0, isActive: true,
    }));
  }

  private async appendPointTransaction(manager: DataSource['manager'], input: {
    customer: Customer; salesOrderId?: number | null; transactionType: 'EARN' | 'REDEEM' | 'RETURN_REVERSE';
    pointsChange: number; amountBasis?: number | null; notes?: string | null; transactionAt: Date; expireAt?: Date | null;
  }) {
    input.customer.currentPoints = Number((Number(input.customer.currentPoints) + input.pointsChange).toFixed(4));
    if (input.customer.currentPoints < 0) throw new BadRequestException('Customer points cannot be negative');

    await manager.save(Customer, input.customer);
    await manager.save(LoyaltyPointTransaction, manager.create(LoyaltyPointTransaction, {
      customerId: input.customer.id, salesOrderId: input.salesOrderId ?? null,
      transactionType: input.transactionType, pointsChange: input.pointsChange, balanceAfter: input.customer.currentPoints,
      amountBasis: input.amountBasis === undefined || input.amountBasis === null ? null : input.amountBasis.toFixed(2),
      notes: input.notes ?? null, transactionAt: input.transactionAt, expireAt: input.expireAt ?? null,
    }));
  }
}
