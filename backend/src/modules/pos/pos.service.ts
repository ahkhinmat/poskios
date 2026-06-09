import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CreatePosDraftTabDto } from './dto/create-pos-draft-tab.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { PosDraftItemDto } from './dto/pos-draft-item.dto';
import { ResolvePosProductQueryDto } from './dto/resolve-pos-product-query.dto';
import { ReturnCheckoutDto } from './dto/return-checkout.dto';
import { SearchPosProductsQueryDto } from './dto/search-pos-products-query.dto';
import { UpdatePosDraftTabDto } from './dto/update-pos-draft-tab.dto';
import { Category } from './entities/category.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { PosDraftTabItem } from './entities/pos-draft-tab-item.entity';
import { PosDraftTab } from './entities/pos-draft-tab.entity';
import { ProductUnit } from './entities/product-unit.entity';
import { Product } from './entities/product.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { Setting } from './entities/setting.entity';
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
        salePrice: this.toDecimalString(getCellText('Giá bán'), 2),
        costPrice: this.toDecimalString(getCellText('Giá vốn'), 2),
        stockOnHand: this.toDecimalString(getCellText('Tồn kho'), 3),
        minStock: this.toDecimalString(getCellText('Tồn nhỏ nhất'), 3),
        maxStock: this.toDecimalString(getCellText('Tồn lớn nhất'), 3),
        unitName: getCellText('ĐVT') || 'Cái',
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
          conversionValue: '1.000',
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          allowDirectSale: row.allowDirectSale,
          isDefaultForPos: true,
          isSmallestUnit: true,
          isActive: row.isActive,
        });
      } else {
        productUnit.barcode = row.barcode;
        productUnit.conversionValue = '1.000';
        productUnit.costPrice = row.costPrice;
        productUnit.salePrice = row.salePrice;
        productUnit.allowDirectSale = row.allowDirectSale;
        productUnit.isDefaultForPos = true;
        productUnit.isSmallestUnit = true;
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
      .andWhere('productUnit.isSmallestUnit = :isSmallestUnit', {
        isSmallestUnit: true,
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
      .limit(query.limit)
      .getMany();

    return {
      items: items.map((item) => this.toPosProductResponse(item)),
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
      .andWhere('productUnit.isSmallestUnit = :isSmallestUnit', {
        isSmallestUnit: true,
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

    return this.toPosProductResponse(productUnit);
  }

  async listProductUnits(productId: number) {
    const productUnits = await this.productUnitRepository.find({
      where: {
        productId,
        isActive: true,
        allowDirectSale: true,
      },
      relations: {
        product: true,
        unit: true,
      },
      order: {
        isSmallestUnit: 'DESC',
        conversionValue: 'ASC',
        id: 'ASC',
      },
    });

    const filteredItems = productUnits.filter(
      (item) => item.product.isActive && item.product.allowDirectSale,
    );

    if (!filteredItems.length) {
      throw new NotFoundException('Product units not found');
    }

    return {
      items: filteredItems.map((item) => this.toPosProductUnitResponse(item)),
    };
  }

  async listDraftTabs(userId: number) {
    const tabs = await this.posDraftTabRepository.find({
      where: {
        createdByUserId: userId,
        isActive: true,
      },
      relations: {
        items: true,
      },
      order: {
        lastTouchedAt: 'DESC',
        items: {
          sortOrder: 'ASC',
        },
      },
    });

    return {
      items: tabs.map((tab) => this.toDraftTabResponse(tab)),
    };
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
    return this.toDraftTabResponse(draftTab);
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
    return this.toDraftTabResponse(updated);
  }

  async closeDraftTab(draftTabId: number, userId: number) {
    const draftTab = await this.getDraftTabOrThrow(draftTabId, userId);
    draftTab.isActive = false;
    draftTab.lastTouchedAt = new Date();
    await this.posDraftTabRepository.save(draftTab);

    return {
      id: draftTab.id,
      tabCode: draftTab.tabCode,
      isActive: draftTab.isActive,
    };
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

  private toDraftTabResponse(tab: PosDraftTab) {
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
  salePrice: string;
  costPrice: string;
  stockOnHand: string;
  minStock: string;
  maxStock: string;
  unitName: string;
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
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
