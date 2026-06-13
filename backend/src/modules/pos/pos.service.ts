import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CreatePosDraftTabDto } from './dto/create-pos-draft-tab.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { PurchaseCheckoutDto } from './dto/purchase-checkout.dto';
import { PosDraftItemDto } from './dto/pos-draft-item.dto';
import { ResolvePosProductQueryDto } from './dto/resolve-pos-product-query.dto';
import { ReturnCheckoutDto } from './dto/return-checkout.dto';
import { SearchPosProductsQueryDto } from './dto/search-pos-products-query.dto';
import { UpdatePosDraftTabDto } from './dto/update-pos-draft-tab.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from './entities/category.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { PosDraftTabItem } from './entities/pos-draft-tab-item.entity';
import { PosDraftTab } from './entities/pos-draft-tab.entity';
import { ProductUnit } from './entities/product-unit.entity';
import { Product } from './entities/product.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { Setting } from './entities/setting.entity';
import { Supplier } from './entities/supplier.entity';
import { Unit } from './entities/unit.entity';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class PosService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(InventoryTransaction)
    private readonly inventoryTransactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem)
    private readonly salesOrderItemRepository: Repository<SalesOrderItem>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(PosDraftTab)
    private readonly posDraftTabRepository: Repository<PosDraftTab>,
    @InjectRepository(PosDraftTabItem)
    private readonly posDraftTabItemRepository: Repository<PosDraftTabItem>,
  ) {}

  async searchReturnInvoice(params: {
    invoiceCode?: string;
    productCode?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const hasInvoiceCode = params.invoiceCode?.trim();
    const hasProductCode = params.productCode?.trim();
    const hasFromDate = params.fromDate?.trim();
    const hasToDate = params.toDate?.trim();

    if (!hasInvoiceCode && !hasProductCode && !hasFromDate && !hasToDate) {
      return { items: [] };
    }

    const query = this.salesOrderRepository
      .createQueryBuilder('so')
      .where('so.isActive = :isActive', { isActive: true })
      .andWhere("so.status != 'CANCELLED'");

    if (hasInvoiceCode) {
      query.andWhere('so.salesOrderCode LIKE :invoiceCode', {
        invoiceCode: `%${params.invoiceCode!.trim().toUpperCase()}%`,
      });
    }

    if (hasProductCode) {
      query.innerJoin(
        (qb) =>
          qb
            .select('DISTINCT soi.salesOrderId', 'salesOrderId')
            .from(SalesOrderItem, 'soi')
            .where('soi.productCodeSnapshot LIKE :productCode', {
              productCode: `%${params.productCode!.trim().toUpperCase()}%`,
            }),
        'filtered_soi',
        'filtered_soi.salesOrderId = so.id',
      );
    }

    if (hasFromDate) {
      query.andWhere('so.soldAt >= :fromDate', {
        fromDate: new Date(params.fromDate!),
      });
    }

    if (hasToDate) {
      query.andWhere('so.soldAt <= :toDate', {
        toDate: new Date(params.toDate! + 'T23:59:59.999'),
      });
    }

    const orders = await query
      .take(20)
      .orderBy('so.id', 'DESC')
      .getMany();

    return {
      items: orders.map((o) => ({
        id: o.id,
        salesOrderCode: o.salesOrderCode,
        status: o.status,
        orderType: o.orderType,
        soldAt: o.soldAt,
        customerName: o.customerName,
        totalAmount: Number(o.totalAmount),
      })),
    };
  }

  async getReturnInvoiceItems(invoiceId: number) {
    const order = await this.salesOrderRepository.findOne({
      where: { id: invoiceId, isActive: true },
    });

    if (!order) {
      throw new NotFoundException('Invoice not found');
    }

    const items = await this.salesOrderItemRepository.find({
      where: { salesOrderId: invoiceId },
    });

    const productUnitIds = [...new Set(items.map((i) => i.productUnitId))];
    const productUnits = await this.productUnitRepository.find({
      where: { id: In(productUnitIds), isActive: true },
    });
    const puMap = new Map(productUnits.map((pu) => [pu.id, pu]));

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.productRepository.find({
      where: { id: In(productIds) },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return {
      salesOrderCode: order.salesOrderCode,
      soldAt: order.soldAt,
      customerName: order.customerName,
      items: items.map((i) => {
        const pu = puMap.get(i.productUnitId);
        return {
          salesOrderItemId: i.id,
          productId: i.productId,
          productUnitId: i.productUnitId,
          unitId: pu?.unitId ?? 0,
          productCode: i.productCodeSnapshot,
          barcode: i.barcodeSnapshot,
          productName: i.productNameSnapshot,
          unitName: i.unitNameSnapshot,
          conversionValue: Number(i.conversionValue),
          originalQuantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountAmount: Number(i.discountAmount),
          lineTotal: Number(i.lineTotal),
          stockOnHand: Number(productMap.get(i.productId)?.stockOnHand ?? 0),
        };
      }),
    };
  }

  async returnCheckout(userId: number, payload: ReturnCheckoutDto) {
    if (!payload.items.length) {
      throw new BadRequestException('Return cart is empty');
    }

    const sourceSalesOrder = await this.salesOrderRepository.findOne({
      where: {
        id: payload.sourceSalesOrderId,
      },
    });

    if (!sourceSalesOrder) {
      throw new NotFoundException('Source sales order not found');
    }

    const setting = await this.settingRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const productUnits = await manager.find(ProductUnit, {
        where: {
          id: In(payload.items.map((item) => item.productUnitId)),
          isActive: true,
        },
        relations: {
          product: true,
          unit: true,
        },
      });

      const productUnitMap = new Map(productUnits.map((item) => [item.id, item]));

      let subtotalAmount = 0;
      let lineDiscountAmount = 0;
      let itemCount = 0;

      const normalizedItems = payload.items.map((item, index) => {
        const productUnit = productUnitMap.get(item.productUnitId);

        if (!productUnit || productUnit.product.id !== item.productId) {
          throw new BadRequestException(
            `Invalid return product unit at items[${index}]`,
          );
        }

        const grossAmount = item.quantity * item.unitPrice;
        const lineTotal = Number(
          (grossAmount - item.discountAmount).toFixed(2),
        );

        if (lineTotal < 0) {
          throw new BadRequestException(
            `Invalid return line total at items[${index}]`,
          );
        }

        subtotalAmount += grossAmount;
        lineDiscountAmount += item.discountAmount;
        itemCount += item.quantity;

        return {
          input: item,
          productUnit,
          lineTotal,
        };
      });

      const orderDiscountAmount = payload.discountAmount ?? 0;
      const returnFeeAmount = payload.returnFeeAmount ?? 0;
      const refundAmount = Number(
        (
          subtotalAmount -
          lineDiscountAmount -
          orderDiscountAmount -
          returnFeeAmount
        ).toFixed(2),
      );

      if (refundAmount < 0) {
        throw new BadRequestException('Invalid return checkout total');
      }

      if (payload.customerRefundAmount < refundAmount) {
        throw new BadRequestException(
          'Customer refund amount must be greater than or equal to refund total',
        );
      }

      const salesOrderCode = await this.generateSalesOrderCode(manager, 'TH');
      const soldAt = new Date();

      const salesOrder = await manager.save(
        SalesOrder,
        manager.create(SalesOrder, {
          createdByUserId: userId,
          cancelledByUserId: null,
          sourceSalesOrderId: payload.sourceSalesOrderId,
          salesOrderCode,
          orderType: 'RETURN',
          status: 'COMPLETED',
          saleMode: payload.saleMode,
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName ?? sourceSalesOrder.customerName,
          customerPhone: payload.customerPhone ?? sourceSalesOrder.customerPhone,
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
        }),
      );

      const receiptItems: ReceiptItem[] = [];

      for (const item of normalizedItems) {
        await manager.save(
          SalesOrderItem,
          manager.create(SalesOrderItem, {
            salesOrderId: salesOrder.id,
            productId: item.productUnit.product.id,
            productUnitId: item.productUnit.id,
            productCodeSnapshot: item.productUnit.product.productCode,
            barcodeSnapshot:
              item.productUnit.barcode ?? item.productUnit.product.barcode,
            productNameSnapshot: item.productUnit.product.name,
            unitNameSnapshot: item.productUnit.unit.name,
            conversionValue: item.productUnit.conversionValue,
            quantity: item.input.quantity.toFixed(3),
            costPrice: item.productUnit.costPrice,
            unitPrice: item.input.unitPrice.toFixed(2),
            discountAmount: item.input.discountAmount.toFixed(2),
            lineTotal: item.lineTotal.toFixed(2),
            notes: item.input.note ?? null,
          }),
        );

        const stockBefore = Number(item.productUnit.product.stockOnHand);
        const stockAfter = Number(
          (stockBefore + item.input.quantity).toFixed(3),
        );

        item.productUnit.product.stockOnHand = stockAfter.toFixed(3);
        await manager.save(Product, item.productUnit.product);

        await manager.save(
          InventoryTransaction,
          manager.create(InventoryTransaction, {
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
          }),
        );

        receiptItems.push({
          productName: item.productUnit.product.name,
          unitName: item.productUnit.unit.name,
          quantity: item.input.quantity,
          unitPrice: item.input.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      return {
        salesOrder,
        itemCount,
        subtotalAmount,
        orderDiscountAmount,
        returnFeeAmount,
        refundAmount,
        receiptItems,
      };
    });

    return {
      salesOrderId: result.salesOrder.id,
      salesOrderCode: result.salesOrder.salesOrderCode,
      status: result.salesOrder.status,
      soldAt: result.salesOrder.soldAt,
      cashier: {
        id: userId,
        fullName: `User ${userId}`,
      },
      summary: {
        itemCount: result.itemCount,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.orderDiscountAmount,
        returnFeeAmount: result.returnFeeAmount,
        totalAmount: result.refundAmount,
        customerRefundAmount: Number(result.salesOrder.customerPaidAmount),
        paymentMethod: result.salesOrder.paymentMethod,
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
      },
    };
  }

  async checkout(userId: number, payload: PosCheckoutDto) {
    if (!payload.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    const setting = await this.settingRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    const result = await this.dataSource.transaction(async (manager) => {
      const productUnits = await manager.find(ProductUnit, {
        where: {
          id: In(payload.items.map((item) => item.productUnitId)),
          isActive: true,
        },
        relations: {
          product: true,
          unit: true,
        },
      });

      const productUnitMap = new Map(productUnits.map((item) => [item.id, item]));

      let subtotalAmount = 0;
      let lineDiscountAmount = 0;
      let itemCount = 0;

      const normalizedItems = payload.items.map((item, index) => {
        const productUnit = productUnitMap.get(item.productUnitId);

        if (!productUnit || productUnit.product.id !== item.productId) {
          throw new BadRequestException(
            `Invalid product unit at items[${index}]`,
          );
        }

        if (!productUnit.product.isActive || !productUnit.product.allowDirectSale) {
          throw new BadRequestException(
            `Product is inactive or not allowed for direct sale at items[${index}]`,
          );
        }

        const grossAmount = item.quantity * item.unitPrice;
        const lineTotal = Number(
          (grossAmount - item.discountAmount).toFixed(2),
        );

        if (lineTotal < 0) {
          throw new BadRequestException(
            `Invalid line total at items[${index}]`,
          );
        }

        subtotalAmount += grossAmount;
        lineDiscountAmount += item.discountAmount;
        itemCount += item.quantity;

        return {
          input: item,
          productUnit,
          grossAmount,
          lineTotal,
        };
      });

      const orderDiscountAmount = payload.discountAmount ?? 0;
      const totalAmount = Number(
        (subtotalAmount - lineDiscountAmount - orderDiscountAmount).toFixed(2),
      );

      if (totalAmount < 0) {
        throw new BadRequestException('Invalid checkout total');
      }

      if (
        payload.paymentMethod === 'CASH' &&
        payload.customerPaidAmount < totalAmount
      ) {
        throw new BadRequestException(
          'Customer paid amount must be greater than or equal to total amount',
        );
      }

      const changeAmount =
        payload.paymentMethod === 'CASH'
          ? Number((payload.customerPaidAmount - totalAmount).toFixed(2))
          : 0;

      const salesOrderCode = await this.generateSalesOrderCode(manager, 'HD');
      const soldAt = new Date();

      const salesOrder = await manager.save(
        SalesOrder,
        manager.create(SalesOrder, {
          createdByUserId: userId,
          cancelledByUserId: null,
          sourceSalesOrderId: null,
          salesOrderCode,
          orderType: 'SALE',
          status: 'COMPLETED',
          saleMode: payload.saleMode,
          paymentMethod: payload.paymentMethod,
          customerName: payload.customerName ?? null,
          customerPhone: payload.customerPhone ?? null,
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
        }),
      );

      const receiptItems: ReceiptItem[] = [];

      for (const item of normalizedItems) {
        await manager.save(
          SalesOrderItem,
          manager.create(SalesOrderItem, {
            salesOrderId: salesOrder.id,
            productId: item.productUnit.product.id,
            productUnitId: item.productUnit.id,
            productCodeSnapshot: item.productUnit.product.productCode,
            barcodeSnapshot:
              item.productUnit.barcode ?? item.productUnit.product.barcode,
            productNameSnapshot: item.productUnit.product.name,
            unitNameSnapshot: item.productUnit.unit.name,
            conversionValue: item.productUnit.conversionValue,
            quantity: item.input.quantity.toFixed(3),
            costPrice: item.productUnit.costPrice,
            unitPrice: item.input.unitPrice.toFixed(2),
            discountAmount: item.input.discountAmount.toFixed(2),
            lineTotal: item.lineTotal.toFixed(2),
            notes: item.input.note ?? null,
          }),
        );

        const stockBefore = Number(item.productUnit.product.stockOnHand);
        const stockAfter = Number(
          (stockBefore - item.input.quantity).toFixed(3),
        );

        item.productUnit.product.stockOnHand = stockAfter.toFixed(3);
        await manager.save(Product, item.productUnit.product);

        await manager.save(
          InventoryTransaction,
          manager.create(InventoryTransaction, {
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
          }),
        );

        receiptItems.push({
          productName: item.productUnit.product.name,
          unitName: item.productUnit.unit.name,
          quantity: item.input.quantity,
          unitPrice: item.input.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      return {
        salesOrder,
        itemCount,
        subtotalAmount,
        orderDiscountAmount,
        totalAmount,
        changeAmount,
        receiptItems,
      };
    });

    return {
      salesOrderId: result.salesOrder.id,
      salesOrderCode: result.salesOrder.salesOrderCode,
      status: result.salesOrder.status,
      soldAt: result.salesOrder.soldAt,
      cashier: {
        id: userId,
        fullName: `User ${userId}`,
      },
      summary: {
        itemCount: result.itemCount,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.orderDiscountAmount,
        totalAmount: result.totalAmount,
        customerPaidAmount: Number(result.salesOrder.customerPaidAmount),
        changeAmount: result.changeAmount,
        paymentMethod: result.salesOrder.paymentMethod,
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
        totalAmount: result.totalAmount,
        customerPaidAmount: Number(result.salesOrder.customerPaidAmount),
        changeAmount: result.changeAmount,
        footerMessage: setting?.receiptFooter ?? setting?.receiptHeader ?? null,
      },
    };
  }

  async purchaseCheckout(userId: number, payload: PurchaseCheckoutDto) {
    if (!payload.items.length) {
      throw new BadRequestException('Purchase cart is empty');
    }

    const setting = await this.settingRepository.findOne({
      where: {},
      order: { id: 'ASC' },
    });

    const supplier =
      payload.supplierId != null
        ? await this.supplierRepository.findOne({
            where: { id: payload.supplierId, isActive: true as never },
          } as never)
        : null;

    const result = await this.dataSource.transaction(async (manager) => {
      const productUnits = await manager.find(ProductUnit, {
        where: {
          id: In(payload.items.map((item) => item.productUnitId)),
          isActive: true,
        },
        relations: {
          product: true,
          unit: true,
        },
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

        if (lineTotal < 0) {
          throw new BadRequestException(`Invalid purchase line total at items[${index}]`);
        }

        subtotalAmount += grossAmount;
        lineDiscountAmount += item.discountAmount;
        itemCount += item.quantity;

        return {
          input: item,
          productUnit,
          lineTotal,
        };
      });

      const orderDiscountAmount = payload.discountAmount ?? 0;
      const totalAmount = Number((subtotalAmount - lineDiscountAmount - orderDiscountAmount).toFixed(2));

      if (totalAmount < 0) {
        throw new BadRequestException('Invalid purchase total');
      }

      const supplierPaidAmount = Number((payload.supplierPaidAmount ?? 0).toFixed(2));
      const debtAmount = Number((totalAmount - supplierPaidAmount).toFixed(2));

      const orderedAt = payload.importDate ? new Date(payload.importDate) : new Date();
      const purchaseOrder = await manager.save(
        PurchaseOrder,
        manager.create(PurchaseOrder, {
          supplierId: payload.supplierId ?? null,
          createdByUserId: userId,
          approvedByUserId: userId,
          purchaseOrderCode: payload.purchaseOrderCode,
          supplierNameSnapshot: supplier?.name ?? null,
          status: payload.status?.trim() || 'COMPLETED',
          notes: payload.note ?? null,
          subtotalAmount: subtotalAmount.toFixed(2),
          discountAmount: orderDiscountAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          orderedAt,
          confirmedAt: new Date(),
          isActive: true,
        }),
      );

      const receiptItems: ReceiptItem[] = [];

      for (const item of normalizedItems) {
        await manager.save(
          PurchaseOrderItem,
          manager.create(PurchaseOrderItem, {
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
          }),
        );

        const stockBefore = Number(item.productUnit.product.stockOnHand);
        const stockAfter = Number((stockBefore + item.input.quantity).toFixed(3));

        item.productUnit.product.stockOnHand = stockAfter.toFixed(3);
        item.productUnit.product.costPrice = item.input.unitPrice.toFixed(2);
        await manager.save(Product, item.productUnit.product);

        item.productUnit.costPrice = item.input.unitPrice.toFixed(2);
        await manager.save(ProductUnit, item.productUnit);

        await manager.save(
          InventoryTransaction,
          manager.create(InventoryTransaction, {
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
          }),
        );

        receiptItems.push({
          productName: item.productUnit.product.name,
          unitName: item.productUnit.unit.name,
          quantity: item.input.quantity,
          unitPrice: item.input.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      return {
        purchaseOrder,
        itemCount,
        subtotalAmount,
        orderDiscountAmount,
        totalAmount,
        supplierPaidAmount,
        debtAmount,
        receiptItems,
      };
    });

    return {
      purchaseOrderId: result.purchaseOrder.id,
      purchaseOrderCode: result.purchaseOrder.purchaseOrderCode,
      status: result.purchaseOrder.status,
      orderedAt: result.purchaseOrder.orderedAt,
      supplier: {
        id: supplier?.id ?? null,
        name: supplier?.name ?? null,
      },
      summary: {
        itemCount: result.itemCount,
        subtotalAmount: result.subtotalAmount,
        discountAmount: result.orderDiscountAmount,
        totalAmount: result.totalAmount,
        supplierPaidAmount: result.supplierPaidAmount,
        debtAmount: result.debtAmount,
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

  async importProductsExcel(file?: UploadedExcelFile) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are supported');
    }

    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: false,
    });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = worksheetName
      ? workbook.Sheets[worksheetName]
      : undefined;

    if (!worksheet || !worksheetName) {
      throw new BadRequestException('Workbook does not contain any worksheet');
    }

    const rowsAsArrays = XLSX.utils.sheet_to_json<(string | number | null)[]>(
      worksheet,
      {
        header: 1,
        raw: false,
        defval: '',
      },
    );

    const headers = (rowsAsArrays[0] ?? []).map((value) =>
      String(value ?? '').trim(),
    );
    const headerMap = new Map<string, number>();
    headers.forEach((header, index) => {
      if (header) {
        headerMap.set(header, index);
      }
    });

    const requiredHeaders = [
      'Nhóm hàng(3 Cấp)',
      'Mã hàng',
      'Tên hàng',
      'Giá bán',
      'Giá vốn',
      'Tồn kho',
      'Tồn nhỏ nhất',
      'Tồn lớn nhất',
      'ĐVT',
      'Đang kinh doanh',
      'Được bán trực tiếp',
    ];

    for (const header of requiredHeaders) {
      if (!headerMap.has(header)) {
        throw new BadRequestException(`Missing required column: ${header}`);
      }
    }

    const rows: ImportProductRow[] = [];
    for (let rowIndex = 1; rowIndex < rowsAsArrays.length; rowIndex += 1) {
      const rowNumber = rowIndex + 1;
      const rowData = rowsAsArrays[rowIndex] ?? [];
      const getCellText = (header: string) =>
        this.getSheetArrayCellText(rowData, headerMap, header);

      const productCode = getCellText('Mã hàng');
      const productName = getCellText('Tên hàng');
      const categoryName = getCellText('Nhóm hàng(3 Cấp)');

      if (!productCode || !productName || !categoryName) {
        continue;
      }

      rows.push({
        rowNumber,
        categoryName,
        productCode,
        barcode: getCellText('Mã vạch') || null,
        productName,
        variantGroupCode: this.resolveVariantGroupCode({
          productCode,
          barcode: getCellText('Mã vạch') || null,
          relatedProductCode: this.emptyToNull(getCellText('Mã HH Liên quan')),
          baseUnitCode: this.emptyToNull(getCellText('Mã ĐVT Cơ bản')),
          productName,
        }),
        salePrice: this.toDecimalString(getCellText('Giá bán'), 2),
        costPrice: this.toDecimalString(getCellText('Giá vốn'), 2),
        stockOnHand: this.toDecimalString(getCellText('Tồn kho'), 3),
        minStock: this.toDecimalString(getCellText('Tồn nhỏ nhất'), 3),
        maxStock: this.toDecimalString(getCellText('Tồn lớn nhất'), 3),
        unitName: getCellText('ĐVT') || 'Cái',
        conversionValue: this.toDecimalString(getCellText('Quy đổi') || '1', 3),
        description: this.emptyToNull(getCellText('Mô tả')),
        noteTemplate: this.emptyToNull(getCellText('Mẫu ghi chú')),
        location: this.emptyToNull(getCellText('Vị trí')),
        weight: this.toOptionalDecimalString(getCellText('Trọng lượng'), 3),
        trackBatchExpiry: this.toBooleanFlag(
          getCellText('Quản lý lô-hạn sử dụng'),
        ),
        isActive: this.toBooleanFlag(getCellText('Đang kinh doanh')),
        allowDirectSale: this.toBooleanFlag(
          getCellText('Được bán trực tiếp'),
        ),
        importedCreatedAt: this.toOptionalDate(getCellText('Thời gian tạo')),
      });
    }

    if (!rows.length) {
      throw new BadRequestException('No valid data rows found in worksheet');
    }

    const categoryMap = await this.ensureCategories(rows);
    const unitMap = await this.ensureUnits(rows);
    const productMap = await this.loadExistingProducts(rows);
    const productUnitMap = await this.loadExistingProductUnits(productMap);

    let createdProducts = 0;
    let updatedProducts = 0;
    let createdProductUnits = 0;
    let updatedProductUnits = 0;

    for (const row of rows) {
      const category = categoryMap.get(
        this.normalizeLookupKey(row.categoryName),
      );
      const unit = unitMap.get(this.normalizeLookupKey(row.unitName));

      if (!category || !unit) {
        throw new BadRequestException(
          `Import mapping failed at row ${row.rowNumber}`,
        );
      }

      let product = productMap.get(row.productCode);
      const isNewProduct = !product;

      if (!product) {
        product = this.productRepository.create({
          categoryId: category.id,
          brandId: null,
          unitId: unit.id,
          productCode: row.productCode,
          barcode: row.barcode,
          name: row.productName,
          variantGroupCode: row.variantGroupCode,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          stockOnHand: row.stockOnHand,
          minStock: row.minStock,
          maxStock: row.maxStock,
          weight: row.weight,
          description: row.description,
          noteTemplate: row.noteTemplate,
          location: row.location,
          trackBatchExpiry: row.trackBatchExpiry,
          allowDirectSale: row.allowDirectSale,
          isActive: row.isActive,
          importedCreatedAt: row.importedCreatedAt,
        });
      } else {
        product.categoryId = category.id;
        product.unitId = unit.id;
        product.barcode = row.barcode;
        product.name = row.productName;
        product.variantGroupCode = row.variantGroupCode;
        product.costPrice = row.costPrice;
        product.salePrice = row.salePrice;
        product.stockOnHand = row.stockOnHand;
        product.minStock = row.minStock;
        product.maxStock = row.maxStock;
        product.weight = row.weight;
        product.description = row.description;
        product.noteTemplate = row.noteTemplate;
        product.location = row.location;
        product.trackBatchExpiry = row.trackBatchExpiry;
        product.allowDirectSale = row.allowDirectSale;
        product.isActive = row.isActive;
        product.importedCreatedAt = row.importedCreatedAt;
      }

      product = await this.productRepository.save(product);
      productMap.set(product.productCode, product);
      if (isNewProduct) {
        createdProducts += 1;
      } else {
        updatedProducts += 1;
      }

      const productUnitKey = `${product.id}:${unit.id}`;
      let productUnit = productUnitMap.get(productUnitKey);
      const isNewProductUnit = !productUnit;

      if (!productUnit) {
        productUnit = this.productUnitRepository.create({
          productId: product.id,
          unitId: unit.id,
          barcode: row.barcode,
          conversionValue: row.conversionValue,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          allowDirectSale: row.allowDirectSale,
          isDefaultForPos: this.toNumber(row.conversionValue) <= 1,
          isSmallestUnit: this.toNumber(row.conversionValue) <= 1,
          isActive: row.isActive,
        });
      } else {
        productUnit.barcode = row.barcode;
        productUnit.conversionValue = row.conversionValue;
        productUnit.costPrice = row.costPrice;
        productUnit.salePrice = row.salePrice;
        productUnit.allowDirectSale = row.allowDirectSale;
        productUnit.isDefaultForPos = this.toNumber(row.conversionValue) <= 1;
        productUnit.isSmallestUnit = this.toNumber(row.conversionValue) <= 1;
        productUnit.isActive = row.isActive;
      }

      productUnit = await this.productUnitRepository.save(productUnit);
      productUnitMap.set(productUnitKey, productUnit);
      if (isNewProductUnit) {
        createdProductUnits += 1;
      } else {
        updatedProductUnits += 1;
      }
    }

    await this.syncVariantGroupProductUnits(rows);

    return {
      fileName: file.originalname,
      worksheetName,
      totalRows: rows.length,
      createdProducts,
      updatedProducts,
      createdProductUnits,
      updatedProductUnits,
    };
  }

  async searchProducts(query: SearchPosProductsQueryDto) {
    const keyword = query.keyword.trim();
    const items = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.allowDirectSale = :allowDirectSale', {
        allowDirectSale: true,
      })
      .andWhere('productUnit.isActive = :productUnitIsActive', {
        productUnitIsActive: true,
      })
      .andWhere('productUnit.allowDirectSale = :productUnitAllowDirectSale', {
        productUnitAllowDirectSale: true,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('productUnit.barcode = :keyword', { keyword })
            .orWhere('product.barcode = :keyword', { keyword })
            .orWhere('product.productCode = :keyword', { keyword })
            .orWhere('product.name LIKE :nameKeyword', {
              nameKeyword: `%${keyword}%`,
            });
        }),
      )
      .orderBy(
        `CASE
          WHEN productUnit.barcode = :keyword THEN 1
          WHEN product.barcode = :keyword THEN 2
          WHEN product.productCode = :keyword THEN 3
          ELSE 4
        END`,
      )
      .addOrderBy('product.name', 'ASC')
      .setParameter('keyword', keyword)
      .limit(query.limit * 5)
      .getMany();

    const grouped = this.pickDefaultUnitsForGroups(items);

    return {
      items: grouped.slice(0, query.limit).map((item) => this.toPosProductResponse(item)),
    };
  }

  async resolveProduct(query: ResolvePosProductQueryDto) {
    const code = query.code.trim();
    const productUnit = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.allowDirectSale = :allowDirectSale', {
        allowDirectSale: true,
      })
      .andWhere('productUnit.isActive = :productUnitIsActive', {
        productUnitIsActive: true,
      })
      .andWhere('productUnit.allowDirectSale = :productUnitAllowDirectSale', {
        productUnitAllowDirectSale: true,
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('productUnit.barcode = :code', { code })
            .orWhere('product.barcode = :code', { code })
            .orWhere('product.productCode = :code', { code });
        }),
      )
      .orderBy(
        `CASE
          WHEN productUnit.barcode = :code THEN 1
          WHEN product.barcode = :code THEN 2
          WHEN product.productCode = :code THEN 3
          ELSE 4
        END`,
      )
      .setParameter('code', code)
      .getOne();

    if (!productUnit) {
      throw new NotFoundException('Product not found');
    }

    return this.toPosProductResponse(
      await this.getDefaultProductUnitForGroup(productUnit),
    );
  }

  async listProductUnits(productId: number) {
    const selectedProductUnit = await this.productUnitRepository.findOne({
      where: { productId, isActive: true, allowDirectSale: true },
      relations: {
        product: true,
        unit: true,
      },
      order: {
        isDefaultForPos: 'DESC',
        isSmallestUnit: 'DESC',
        id: 'ASC',
      },
    });

    if (!selectedProductUnit?.product) {
      throw new NotFoundException('Product units not found');
    }

    const groupCode =
      selectedProductUnit.product.variantGroupCode ??
      selectedProductUnit.product.productCode;

    const productUnits = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('productUnit.isActive = :isActive', { isActive: true })
      .andWhere('productUnit.allowDirectSale = :allowDirectSale', {
        allowDirectSale: true,
      })
      .andWhere('product.isActive = :productIsActive', { productIsActive: true })
      .andWhere('product.allowDirectSale = :productAllowDirectSale', {
        productAllowDirectSale: true,
      })
      .andWhere(
        '(product.variantGroupCode = :groupCode OR (product.variantGroupCode IS NULL AND product.productCode = :groupCode))',
        { groupCode },
      )
      .orderBy('productUnit.isDefaultForPos', 'DESC')
      .addOrderBy('productUnit.isSmallestUnit', 'DESC')
      .addOrderBy('productUnit.conversionValue', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .getMany();

    return {
      items: productUnits.map((item) => this.toPosProductUnitResponse(item)),
    };
  }

  async listDraftTabs(userId: number) {
    const tabs = await this.posDraftTabRepository.find({
      where: { createdByUserId: userId, isActive: true },
      relations: { items: true },
      order: {
        lastTouchedAt: 'DESC',
        items: { sortOrder: 'ASC' },
      },
    });

    const stockMap = await this.buildStockMapForTabs(tabs);

    return {
      items: tabs.map((tab) => this.toDraftTabResponse(tab, stockMap)),
    };
  }

  private async buildStockMapForTabs(tabs: PosDraftTab[]): Promise<Map<number, number>> {
    const allIds = new Set<number>();
    for (const tab of tabs) {
      for (const item of tab.items ?? []) {
        allIds.add(item.productId);
      }
    }
    if (!allIds.size) return new Map();
    // Fetch product IDs only – lightweight query
    const ids = [...allIds];
    const products = await this.productRepository.find({
      where: { id: In(ids) },
      select: { id: true, stockOnHand: true },
    });
    return new Map(products.map((p) => [p.id, Number(p.stockOnHand)]));
  }

  async createDraftTab(userId: number, payload: CreatePosDraftTabDto) {
    const tabCode = `TAB${Date.now()}`;
    const createdTab = await this.posDraftTabRepository.save(
      this.posDraftTabRepository.create({
        createdByUserId: userId,
        tabCode,
        tabType: payload.tabType,
        title: payload.title,
        saleMode: payload.saleMode,
        customerName: payload.customerName ?? null,
        customerPhone: payload.customerPhone ?? null,
        note: payload.note ?? null,
        paymentMethod: payload.paymentMethod ?? 'CASH',
        customerPaidAmount: payload.customerPaidAmount.toFixed(2),
        discountAmount: payload.discountAmount.toFixed(2),
        sourceSalesOrderId: payload.sourceSalesOrderId ?? null,
        isActive: true,
        lastTouchedAt: new Date(),
      }),
    );

    if (payload.items?.length) {
      await this.replaceDraftTabItems(createdTab.id, payload.items);
    }

    const draftTab = await this.getDraftTabOrThrow(createdTab.id, userId);
    const stockMap = await this.buildStockMapForTabs([draftTab]);
    return this.toDraftTabResponse(draftTab, stockMap);
  }

  async updateDraftTab(
    draftTabId: number,
    userId: number,
    payload: UpdatePosDraftTabDto,
  ) {
    const draftTab = await this.getDraftTabOrThrow(draftTabId, userId);

    if (payload.tabType !== undefined) draftTab.tabType = payload.tabType;
    if (payload.title !== undefined) draftTab.title = payload.title;
    if (payload.saleMode !== undefined) draftTab.saleMode = payload.saleMode;
    if (payload.customerName !== undefined)
      draftTab.customerName = payload.customerName ?? null;
    if (payload.customerPhone !== undefined)
      draftTab.customerPhone = payload.customerPhone ?? null;
    if (payload.note !== undefined) draftTab.note = payload.note ?? null;
    if (payload.paymentMethod !== undefined)
      draftTab.paymentMethod = payload.paymentMethod;
    if (payload.customerPaidAmount !== undefined)
      draftTab.customerPaidAmount = payload.customerPaidAmount.toFixed(2);
    if (payload.discountAmount !== undefined)
      draftTab.discountAmount = payload.discountAmount.toFixed(2);
    if (payload.sourceSalesOrderId !== undefined)
      draftTab.sourceSalesOrderId = payload.sourceSalesOrderId ?? null;
    draftTab.lastTouchedAt = new Date();

    await this.posDraftTabRepository.save(draftTab);

    if (payload.items !== undefined) {
      await this.replaceDraftTabItems(draftTab.id, payload.items);
    }

    const updated = await this.getDraftTabOrThrow(draftTab.id, userId);
    const stockMap = await this.buildStockMapForTabs([updated]);
    return this.toDraftTabResponse(updated, stockMap);
  }

  async closeDraftTab(draftTabId: number, userId: number) {
    const draftTab = await this.getDraftTabOrThrow(draftTabId, userId);
    await this.posDraftTabItemRepository.delete({ posDraftTabId: draftTab.id });
    await this.posDraftTabRepository.delete({ id: draftTab.id });
    return { deleted: true };
  }

  private getVariantGroupCodeFromProductUnit(productUnit: ProductUnit) {
    return productUnit.product.variantGroupCode ?? productUnit.product.productCode;
  }

  private pickDefaultUnitsForGroups(productUnits: ProductUnit[]) {
    const grouped = new Map<string, ProductUnit>();

    for (const item of productUnits) {
      const groupCode = this.getVariantGroupCodeFromProductUnit(item);
      const current = grouped.get(groupCode);

      if (!current || this.compareProductUnitsForDefault(item, current) < 0) {
        grouped.set(groupCode, item);
      }
    }

    return [...grouped.values()];
  }

  private compareProductUnitsForDefault(left: ProductUnit, right: ProductUnit) {
    const leftDefaultScore = left.isDefaultForPos ? 0 : 1;
    const rightDefaultScore = right.isDefaultForPos ? 0 : 1;
    if (leftDefaultScore !== rightDefaultScore) {
      return leftDefaultScore - rightDefaultScore;
    }

    const leftSmallestScore = left.isSmallestUnit ? 0 : 1;
    const rightSmallestScore = right.isSmallestUnit ? 0 : 1;
    if (leftSmallestScore !== rightSmallestScore) {
      return leftSmallestScore - rightSmallestScore;
    }

    const conversionDiff =
      Number(left.conversionValue) - Number(right.conversionValue);
    if (conversionDiff !== 0) {
      return conversionDiff;
    }

    return left.id - right.id;
  }

  private async getDefaultProductUnitForGroup(productUnit: ProductUnit) {
    const groupCode = this.getVariantGroupCodeFromProductUnit(productUnit);
    const siblingUnits = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('productUnit.isActive = :isActive', { isActive: true })
      .andWhere('productUnit.allowDirectSale = :allowDirectSale', {
        allowDirectSale: true,
      })
      .andWhere('product.isActive = :productIsActive', { productIsActive: true })
      .andWhere('product.allowDirectSale = :productAllowDirectSale', {
        productAllowDirectSale: true,
      })
      .andWhere(
        '(product.variantGroupCode = :groupCode OR (product.variantGroupCode IS NULL AND product.productCode = :groupCode))',
        { groupCode },
      )
      .getMany();

    return this.pickDefaultUnitsForGroups(siblingUnits)[0] ?? productUnit;
  }

  private toPosProductResponse(productUnit: ProductUnit) {
    return {
      id: productUnit.product.id,
      productUnitId: productUnit.id,
      productCode: productUnit.product.productCode,
      barcode: productUnit.barcode ?? productUnit.product.barcode,
      name: productUnit.product.name,
      unitId: productUnit.unit.id,
      unitName: productUnit.unit.name,
      conversionValue: Number(productUnit.conversionValue),
      salePrice: Number(productUnit.salePrice),
      stockOnHand: Number(productUnit.product.stockOnHand),
      allowDirectSale:
        productUnit.product.allowDirectSale && productUnit.allowDirectSale,
      isActive: productUnit.product.isActive && productUnit.isActive,
    };
  }

  private toPosProductUnitResponse(productUnit: ProductUnit) {
    return {
      productUnitId: productUnit.id,
      productId: productUnit.product.id,
      productCode: productUnit.product.productCode,
      productName: productUnit.product.name,
      unitId: productUnit.unit.id,
      unitName: productUnit.unit.name,
      barcode: productUnit.barcode ?? productUnit.product.barcode,
      conversionValue: Number(productUnit.conversionValue),
      salePrice: Number(productUnit.salePrice),
      stockOnHand: Number(productUnit.product.stockOnHand),
      allowDirectSale:
        productUnit.product.allowDirectSale && productUnit.allowDirectSale,
      isDefaultForPos: productUnit.isDefaultForPos,
      isSmallestUnit: productUnit.isSmallestUnit,
      isActive: productUnit.product.isActive && productUnit.isActive,
    };
  }

  private async getDraftTabOrThrow(draftTabId: number, userId: number) {
    const draftTab = await this.posDraftTabRepository.findOne({
      where: {
        id: draftTabId,
        createdByUserId: userId,
      },
      relations: {
        items: true,
      },
      order: {
        items: {
          sortOrder: 'ASC',
        },
      },
    });

    if (!draftTab) {
      throw new NotFoundException('Draft tab not found');
    }

    return draftTab;
  }

  private async replaceDraftTabItems(
    draftTabId: number,
    items: PosDraftItemDto[],
  ) {
    await this.posDraftTabItemRepository.delete({ posDraftTabId: draftTabId });

    if (!items.length) {
      return;
    }

    const productUnits = await this.productUnitRepository.find({
      where: items.map((item) => ({
        id: item.productUnitId,
        productId: item.productId,
        isActive: true,
      })),
      relations: {
        product: true,
        unit: true,
      },
    });

    const productUnitMap = new Map(productUnits.map((item) => [item.id, item]));

    const entities = items.map((item, index) => {
      const productUnit = productUnitMap.get(item.productUnitId);

      if (!productUnit || productUnit.product.id !== item.productId) {
        throw new BadRequestException(
          `Invalid product unit at items[${index}]`,
        );
      }

      const lineTotal = Number(
        (item.quantity * item.unitPrice - item.discountAmount).toFixed(2),
      );

      if (lineTotal < 0) {
        throw new BadRequestException(
          `Invalid line total at items[${index}]`,
        );
      }

      return this.posDraftTabItemRepository.create({
        posDraftTabId: draftTabId,
        productId: productUnit.product.id,
        productUnitId: productUnit.id,
        productCodeSnapshot: productUnit.product.productCode,
        barcodeSnapshot: productUnit.barcode ?? productUnit.product.barcode,
        productNameSnapshot: productUnit.product.name,
        unitId: productUnit.unit.id,
        unitNameSnapshot: productUnit.unit.name,
        conversionValue: productUnit.conversionValue,
        quantity: item.quantity.toFixed(3),
        unitPrice: item.unitPrice.toFixed(2),
        discountAmount: item.discountAmount.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        note: item.note ?? null,
        sortOrder: index + 1,
      });
    });

    await this.posDraftTabItemRepository.save(entities);
  }

  private toDraftTabResponse(tab: PosDraftTab, stockMap: Map<number, number> = new Map()) {
    return {
      id: tab.id,
      tabCode: tab.tabCode,
      tabType: tab.tabType,
      title: tab.title,
      saleMode: tab.saleMode,
      customerName: tab.customerName,
      customerPhone: tab.customerPhone,
      note: tab.note,
      paymentMethod: tab.paymentMethod,
      customerPaidAmount: Number(tab.customerPaidAmount),
      discountAmount: Number(tab.discountAmount),
      sourceSalesOrderId: tab.sourceSalesOrderId,
      isActive: tab.isActive,
      lastTouchedAt: tab.lastTouchedAt,
      items: (tab.items ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          productUnitId: item.productUnitId,
          productCode: item.productCodeSnapshot,
          barcode: item.barcodeSnapshot,
          productName: item.productNameSnapshot,
          unitId: item.unitId,
          unitName: item.unitNameSnapshot,
          conversionValue: Number(item.conversionValue),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount),
          lineTotal: Number(item.lineTotal),
          note: item.note,
          sortOrder: item.sortOrder,
          stockOnHand: stockMap.get(item.productId) ?? 0,
        })),
    };
  }

  private getSheetArrayCellText(
    rowData: (string | number | null)[],
    headerMap: Map<string, number>,
    header: string,
  ) {
    const columnIndex = headerMap.get(header);
    if (columnIndex === undefined) {
      return '';
    }

    const value = rowData[columnIndex];

    if (value === null || value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  private async ensureCategories(rows: ImportProductRow[]) {
    const names = [...new Set(rows.map((row) => row.categoryName))];
    const existing = await this.categoryRepository.find();
    const map = new Map(
      existing.map((item) => [this.normalizeLookupKey(item.name), item]),
    );

    for (const name of names) {
      const lookupKey = this.normalizeLookupKey(name);

      if (!map.has(lookupKey)) {
        const saved = await this.categoryRepository.save(
          this.categoryRepository.create({
            name,
            isActive: true,
          }),
        );
        map.set(lookupKey, saved);
      }
    }

    return map;
  }

  private async ensureUnits(rows: ImportProductRow[]) {
    const names = [...new Set(rows.map((row) => row.unitName))];
    const existing = await this.unitRepository.find();
    const map = new Map(
      existing.map((item) => [this.normalizeLookupKey(item.name), item]),
    );

    for (const name of names) {
      const lookupKey = this.normalizeLookupKey(name);

      if (!map.has(lookupKey)) {
        const saved = await this.unitRepository.save(
          this.unitRepository.create({
            name,
          }),
        );
        map.set(lookupKey, saved);
      }
    }

    return map;
  }

  private async loadExistingProducts(rows: ImportProductRow[]) {
    const productCodes = [...new Set(rows.map((row) => row.productCode))];
    const map = new Map<string, Product>();

    for (const chunk of this.chunkArray(productCodes, 500)) {
      const items = await this.productRepository
        .createQueryBuilder('product')
        .where('product.productCode IN (:...codes)', { codes: chunk })
        .getMany();

      for (const item of items) {
        map.set(item.productCode, item);
      }
    }

    return map;
  }

  private async loadExistingProductUnits(productMap: Map<string, Product>) {
    const productIds = [...new Set([...productMap.values()].map((row) => row.id))];
    const map = new Map<string, ProductUnit>();

    for (const chunk of this.chunkArray(productIds, 500)) {
      const items = await this.productUnitRepository
        .createQueryBuilder('productUnit')
        .where('productUnit.productId IN (:...productIds)', {
          productIds: chunk,
        })
        .getMany();

      for (const item of items) {
        map.set(`${item.productId}:${item.unitId}`, item);
      }
    }

    return map;
  }

  private async syncVariantGroupProductUnits(rows: ImportProductRow[]) {
    const groupCodes = [
      ...new Set(rows.map((row) => row.variantGroupCode).filter(Boolean)),
    ];

    if (!groupCodes.length) {
      return;
    }

    for (const chunk of this.chunkArray(groupCodes, 200)) {
      const items = await this.productUnitRepository
        .createQueryBuilder('productUnit')
        .innerJoinAndSelect('productUnit.product', 'product')
        .where(
          '(product.variantGroupCode IN (:...groupCodes) OR product.productCode IN (:...groupCodes))',
          { groupCodes: chunk },
        )
        .getMany();

      const grouped = new Map<string, ProductUnit[]>();
      for (const item of items) {
        const groupCode =
          item.product.variantGroupCode ?? item.product.productCode;
        const current = grouped.get(groupCode) ?? [];
        current.push(item);
        grouped.set(groupCode, current);
      }

      for (const productUnits of grouped.values()) {
        const sorted = [...productUnits].sort((left, right) =>
          this.compareProductUnitsForDefault(left, right),
        );

        for (let index = 0; index < sorted.length; index += 1) {
          const productUnit = sorted[index];
          productUnit.isDefaultForPos = index === 0;
          productUnit.isSmallestUnit =
            Number(productUnit.conversionValue) ===
            Number(sorted[0].conversionValue);
        }
      }

      await this.productUnitRepository.save(items);
    }
  }

  private chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }

  private toDecimalString(value: string, scale: number) {
    const normalized = this.toNumber(value);
    return normalized.toFixed(scale);
  }

  private toOptionalDecimalString(value: string, scale: number) {
    if (!value) {
      return null;
    }

    return this.toNumber(value).toFixed(scale);
  }

  private toNumber(value: string) {
    const normalized = Number(String(value).replace(/,/g, '').trim() || 0);
    if (Number.isNaN(normalized)) {
      return 0;
    }

    return normalized;
  }

  private toBooleanFlag(value: string) {
    return ['1', 'true', 'TRUE', 'yes', 'YES'].includes(String(value).trim());
  }

  private emptyToNull(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private resolveVariantGroupCode(input: {
    productCode: string;
    barcode: string | null;
    relatedProductCode: string | null;
    baseUnitCode: string | null;
    productName: string;
  }) {
    return (
      input.relatedProductCode ??
      input.barcode ??
      input.baseUnitCode ??
      input.productCode ??
      this.normalizeLookupKey(input.productName)
    );
  }

  private normalizeLookupKey(value: string) {
    return value.trim().toLocaleLowerCase('vi-VN');
  }

  private toOptionalDate(value: string) {
    if (!value) {
      return null;
    }

    const numberValue = Number(value);
    if (!Number.isNaN(numberValue) && numberValue > 0) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(numberValue));
      return excelEpoch;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // ── Category CRUD ──

  async searchCategories(keyword?: string) {
    if (!keyword || keyword.trim() === '') {
      return this.categoryRepository.find({
        order: { name: 'ASC' },
      });
    }

    return this.categoryRepository
      .createQueryBuilder('c')
      .where('c.Name LIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('c.Name', 'ASC')
      .getMany();
  }

  async listUnits() {
    const units = await this.unitRepository.find({
      order: { name: 'ASC' },
    });

    return units.map((unit) => ({
      id: unit.id,
      name: unit.name,
    }));
  }

  async listSuppliers(keyword?: string) {
    const query = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.IsActive = :isActive', { isActive: true });

    if (keyword?.trim()) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('supplier.Name LIKE :keyword', {
            keyword: `%${keyword.trim()}%`,
          }).orWhere('supplier.Code LIKE :keyword', {
            keyword: `%${keyword.trim()}%`,
          });
        }),
      );
    }

    const items = await query.orderBy('supplier.Name', 'ASC').getMany();

    return items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      phoneNumber: item.phoneNumber,
      address: item.address,
    }));
  }

  async getOverviewRecords(params: { fromDate?: string; toDate?: string }) {
    const fromDate = params.fromDate?.trim()
      ? new Date(`${params.fromDate.trim()}T00:00:00`)
      : new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
    const toDate = params.toDate?.trim()
      ? new Date(`${params.toDate.trim()}T23:59:59.999`)
      : new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999`);

    const purchaseOrders = await this.purchaseOrderRepository.find({
      where: { isActive: true },
      order: { orderedAt: 'DESC', id: 'DESC' },
      take: 200,
    });

    const salesOrders = await this.salesOrderRepository.find({
      where: { isActive: true },
      order: { soldAt: 'DESC', id: 'DESC' },
      take: 200,
    });

    const purchaseItems = await this.purchaseOrderItemRepository.find({
      where: { purchaseOrderId: In(purchaseOrders.map((order) => order.id)) },
    });

    const salesItems = await this.salesOrderItemRepository.find({
      where: { salesOrderId: In(salesOrders.map((order) => order.id)) },
    });

    const purchaseCostMap = new Map<number, number>();
    for (const item of purchaseItems) {
      const costAmount = Number(item.costPrice) * Number(item.quantity);
      purchaseCostMap.set(
        item.purchaseOrderId,
        (purchaseCostMap.get(item.purchaseOrderId) ?? 0) + costAmount,
      );
    }

    const salesCostMap = new Map<number, number>();
    for (const item of salesItems) {
      const costAmount = Number(item.costPrice) * Number(item.quantity);
      salesCostMap.set(
        item.salesOrderId,
        (salesCostMap.get(item.salesOrderId) ?? 0) + costAmount,
      );
    }

    const items = [
      ...purchaseOrders
        .filter((order) => order.orderedAt >= fromDate && order.orderedAt <= toDate)
        .map((order) => ({
          id: order.id,
          recordType: 'PURCHASE',
          code: order.purchaseOrderCode,
          status: order.status,
          partyName: order.supplierNameSnapshot,
          subtotalAmount: Number(order.subtotalAmount),
          discountAmount: Number(order.discountAmount),
          totalAmount: Number(order.totalAmount),
          costAmount: Number((purchaseCostMap.get(order.id) ?? Number(order.totalAmount)).toFixed(2)),
          revenueAmount: 0,
          eventAt: order.orderedAt,
        })),
      ...salesOrders
        .filter((order) => order.soldAt >= fromDate && order.soldAt <= toDate)
        .map((order) => ({
          id: order.id,
          recordType: order.orderType === 'RETURN' ? 'RETURN' : 'SALE',
          code: order.salesOrderCode,
          status: order.status,
          partyName: order.customerName,
          subtotalAmount: Number(order.subtotalAmount),
          discountAmount: Number(order.discountAmount),
          totalAmount: Number(order.totalAmount),
          costAmount: Number((salesCostMap.get(order.id) ?? 0).toFixed(2)),
          revenueAmount: Number((Number(order.subtotalAmount) - Number(order.discountAmount)).toFixed(2)),
          eventAt: order.soldAt,
        })),
    ].sort(
      (left, right) =>
        new Date(right.eventAt).getTime() - new Date(left.eventAt).getTime() ||
        right.id - left.id,
    );

    return { items };
  }

  async getOverviewDetail(recordType: string, id: number) {
    const normalizedType = recordType.trim().toUpperCase();

    if (normalizedType === 'PURCHASE') {
      const order = await this.purchaseOrderRepository.findOne({
        where: { id, isActive: true },
      });

      if (!order) {
        throw new NotFoundException('Purchase order not found');
      }

      const items = await this.purchaseOrderItemRepository.find({
        where: { purchaseOrderId: id },
      });

      return {
        header: {
          id: order.id,
          recordType: 'PURCHASE',
          code: order.purchaseOrderCode,
          status: order.status,
          eventAt: order.orderedAt,
          partyName: order.supplierNameSnapshot,
          subtotalAmount: Number(order.subtotalAmount),
          discountAmount: Number(order.discountAmount),
          totalAmount: Number(order.totalAmount),
          costAmount: Number(order.totalAmount),
          revenueAmount: 0,
        },
        items: items.map((item, index) => ({
          rowNo: index + 1,
          eventDate: order.orderedAt,
          productCode: item.productCodeSnapshot,
          productName: item.productNameSnapshot,
          unitName: item.unitNameSnapshot,
          quantity: Number(item.quantity),
          unitPrice: Number(item.costPrice),
          costPrice: Number(item.costPrice),
          revenueAmount: Number(item.lineTotal),
          discountAmount: 0,
          lineTotal: Number(item.lineTotal),
        })),
      };
    }

    if (normalizedType === 'SALE' || normalizedType === 'RETURN') {
      const order = await this.salesOrderRepository.findOne({
        where: { id, isActive: true },
      });

      if (!order) {
        throw new NotFoundException('Sales order not found');
      }

      const items = await this.salesOrderItemRepository.find({
        where: { salesOrderId: id },
      });

      return {
        header: {
          id: order.id,
          recordType: normalizedType,
          code: order.salesOrderCode,
          status: order.status,
          eventAt: order.soldAt,
          partyName: order.customerName,
          subtotalAmount: Number(order.subtotalAmount),
          discountAmount: Number(order.discountAmount),
          totalAmount: Number(order.totalAmount),
          costAmount: Number(
            items.reduce(
              (sum, item) => sum + Number(item.costPrice) * Number(item.quantity),
              0,
            ).toFixed(2),
          ),
          revenueAmount: Number(
            (Number(order.subtotalAmount) - Number(order.discountAmount)).toFixed(2),
          ),
        },
        items: items.map((item, index) => ({
          rowNo: index + 1,
          eventDate: order.soldAt,
          productCode: item.productCodeSnapshot,
          productName: item.productNameSnapshot,
          unitName: item.unitNameSnapshot,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          costPrice: Number(item.costPrice),
          revenueAmount: Number((Number(item.unitPrice) * Number(item.quantity) - Number(item.discountAmount)).toFixed(2)),
          discountAmount: Number(item.discountAmount),
          lineTotal: Number(item.lineTotal),
        })),
      };
    }

    throw new BadRequestException('Invalid overview record type');
  }

  async createCategory(data: { name: string; isActive?: boolean }) {
    const category = this.categoryRepository.create({
      name: data.name,
      isActive: data.isActive ?? true,
    });
    return this.categoryRepository.save(category);
  }

  async updateCategory(
    id: number,
    data: { name?: string; isActive?: boolean },
  ) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (data.name !== undefined) category.name = data.name;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.productRepository.countBy({ categoryId: id });
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${productCount} product(s) linked`,
      );
    }

    await this.categoryRepository.remove(category);
    return { deleted: true };
  }

  // ── Product Management CRUD ──

  async manageProducts(keyword?: string, page = 1, pageSize = 10) {
    // Use raw SQL for COUNT and ID pagination (avoids TypeORM query builder state issues)
    let whereSql = '';
    const sqlParams: any[] = [];
    if (keyword?.trim()) {
      whereSql = 'WHERE (p.ProductCode LIKE @0 OR p.Name LIKE @0 OR p.Barcode LIKE @0)';
      sqlParams.push(`%${keyword.trim()}%`);
    }

    const offset = (page - 1) * pageSize;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(1) AS cnt FROM Products p ${whereSql}`,
      sqlParams,
    );
    const total = Number(countRows[0]?.cnt ?? 0);
    if (!total) return { items: [], total: 0 };

    const idRows = await this.dataSource.query(
      `SELECT p.Id FROM Products p ${whereSql} ORDER BY p.Name ASC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`,
      sqlParams,
    );

    const ids = idRows.map((r: any) => Number(r.Id)).filter((n) => n > 0);

    const products = await this.productRepository.find({
      where: { id: In(ids) },
      order: { name: 'ASC' },
    });

    const allUnits = ids.length
      ? await this.productUnitRepository.find({
          where: { productId: In(ids) },
          relations: { unit: true },
          order: { isDefaultForPos: 'DESC', id: 'ASC' },
        })
      : [];

    const unitsByProductId = new Map<number, ProductUnit[]>();
    for (const pu of allUnits) {
      const list = unitsByProductId.get(pu.productId);
      if (list) list.push(pu);
      else unitsByProductId.set(pu.productId, [pu]);
    }

    return {
      items: products.map((product) => {
        const units = unitsByProductId.get(product.id) ?? [];
        const defaultUnit = units.find((pu) => pu.isDefaultForPos) ?? units[0];
        return {
          id: product.id,
          productCode: product.productCode,
          barcode: product.barcode,
          name: product.name,
          categoryId: product.categoryId,
          costPrice: Number(product.costPrice),
          salePrice: Number(product.salePrice),
          stockOnHand: Number(product.stockOnHand),
          isActive: product.isActive,
          allowDirectSale: product.allowDirectSale,
          units: units.map((pu) => ({
            id: pu.id,
            unitId: pu.unitId,
            unitName: pu.unit?.name ?? '',
            barcode: pu.barcode,
            conversionValue: Number(pu.conversionValue),
            costPrice: Number(pu.costPrice),
            salePrice: Number(pu.salePrice),
            isDefaultForPos: pu.isDefaultForPos,
            isActive: pu.isActive,
          })),
          defaultUnitName: defaultUnit?.unit?.name ?? '',
        };
      }),
      total,
    };
  }

  async createProduct(data: CreateProductDto) {
    const product = this.productRepository.create({
      categoryId: data.categoryId,
      brandId: null,
      unitId: data.unitId,
      productCode: data.productCode,
      barcode: data.barcode ?? null,
      name: data.name,
      costPrice: data.costPrice.toFixed(2),
      salePrice: data.salePrice.toFixed(2),
      stockOnHand: (data.stockOnHand ?? 0).toFixed(3),
      minStock: '0',
      maxStock: '0',
      weight: null,
      description: null,
      noteTemplate: null,
      location: null,
      trackBatchExpiry: false,
      allowDirectSale: data.allowDirectSale ?? true,
      isActive: data.isActive ?? true,
    });

    const saved = await this.productRepository.save(product);

    const productUnit = this.productUnitRepository.create({
      productId: saved.id,
      unitId: data.unitId,
      barcode: data.barcode ?? null,
      conversionValue: '1',
      costPrice: data.costPrice.toFixed(2),
      salePrice: data.salePrice.toFixed(2),
      allowDirectSale: data.allowDirectSale ?? true,
      isDefaultForPos: true,
      isSmallestUnit: true,
      isActive: data.isActive ?? true,
    });

    await this.productUnitRepository.save(productUnit);

    // Re-fetch with units
    const result = await this.manageProducts(saved.productCode);
    return result.items[0] ?? null;
  }

  async updateProduct(id: number, data: UpdateProductDto) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (data.name !== undefined) product.name = data.name;
    if (data.barcode !== undefined) product.barcode = data.barcode;
    if (data.categoryId !== undefined) product.categoryId = data.categoryId;
    if (data.costPrice !== undefined) product.costPrice = data.costPrice.toFixed(2);
    if (data.salePrice !== undefined) product.salePrice = data.salePrice.toFixed(2);
    if (data.stockOnHand !== undefined) product.stockOnHand = data.stockOnHand.toFixed(3);
    if (data.isActive !== undefined) product.isActive = data.isActive;
    if (data.allowDirectSale !== undefined) product.allowDirectSale = data.allowDirectSale;

    // If unitId changed, update the default ProductUnit
    if (data.unitId !== undefined && data.unitId !== product.unitId) {
      product.unitId = data.unitId;
      const existingDefault = await this.productUnitRepository.findOneBy({
        productId: id,
        isDefaultForPos: true,
      });
      if (existingDefault) {
        existingDefault.unitId = data.unitId;
        await this.productUnitRepository.save(existingDefault);
      } else {
        await this.productUnitRepository.save(
          this.productUnitRepository.create({
            productId: id,
            unitId: data.unitId,
            barcode: product.barcode,
            conversionValue: '1',
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            allowDirectSale: product.allowDirectSale,
            isDefaultForPos: true,
            isSmallestUnit: true,
            isActive: product.isActive,
          }),
        );
      }
    }

    await this.productRepository.save(product);

    // Re-fetch with units
    const result = await this.manageProducts(product.productCode);
    return result.items[0] ?? null;
  }

  async deleteProduct(id: number) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.isActive = false;
    await this.productRepository.save(product);

    return { deleted: true };
  }

  private async generateSalesOrderCode(manager: DataSource['manager'], prefix: 'HD' | 'TH') {
    const latest = await manager.findOne(SalesOrder, {
      where: {},
      order: { id: 'DESC' },
    });

    const nextId = (latest?.id ?? 0) + 1;
    return `${prefix}${String(nextId).padStart(7, '0')}`;
  }
}

type ImportProductRow = {
  rowNumber: number;
  categoryName: string;
  productCode: string;
  barcode: string | null;
  productName: string;
  variantGroupCode: string;
  salePrice: string;
  costPrice: string;
  stockOnHand: string;
  minStock: string;
  maxStock: string;
  unitName: string;
  conversionValue: string;
  description: string | null;
  noteTemplate: string | null;
  location: string | null;
  weight: string | null;
  trackBatchExpiry: boolean;
  isActive: boolean;
  allowDirectSale: boolean;
  importedCreatedAt: Date | null;
};

type ReceiptItem = {
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
