import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreatePosDraftTabDto } from '../dto/create-pos-draft-tab.dto';
import { PosDraftItemDto } from '../dto/pos-draft-item.dto';
import { UpdatePosDraftTabDto } from '../dto/update-pos-draft-tab.dto';
import { PosDraftTabItem } from '../entities/pos-draft-tab-item.entity';
import { PosDraftTab } from '../entities/pos-draft-tab.entity';
import { Product } from '../entities/product.entity';
import { ProductUnit } from '../entities/product-unit.entity';
import { SettingService } from './setting.service';

@Injectable()
export class DraftTabService {
  constructor(
    @InjectRepository(PosDraftTab)
    private readonly posDraftTabRepository: Repository<PosDraftTab>,
    @InjectRepository(PosDraftTabItem)
    private readonly posDraftTabItemRepository: Repository<PosDraftTabItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
    private readonly settingService: SettingService,
  ) {}

  async listDraftTabs(userId: number) {
    const tabs = await this.posDraftTabRepository.find({
      where: { createdByUserId: userId, isActive: true },
      relations: { items: true },
      order: { lastTouchedAt: 'DESC', items: { sortOrder: 'ASC' } },
    });

    const stockMap = await this.buildStockMapForTabs(tabs);

    return { items: tabs.map((tab) => this.toDraftTabResponse(tab, stockMap)) };
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
        customerId: payload.customerId ?? null,
        note: payload.note ?? null,
        paymentMethod: payload.paymentMethod ?? (await this.settingService.getOrCreateSetting()).defaultPaymentMethod,
        customerPaidAmount: payload.customerPaidAmount.toFixed(2),
        discountAmount: payload.discountAmount.toFixed(2),
        redeemedPoints: payload.redeemedPoints ?? 0,
        sourceSalesOrderId: payload.sourceSalesOrderId ?? null,
        importDate: payload.importDate ?? null,
        purchaseOrderCode: payload.purchaseOrderCode ?? null,
        supplierId: payload.supplierId ?? null,
        supplierOrderCode: payload.supplierOrderCode ?? null,
        supplierInvoiceCode: payload.supplierInvoiceCode ?? null,
        purchaseStatus: payload.purchaseStatus ?? null,
        supplierPaidAmount: payload.supplierPaidAmount !== undefined ? payload.supplierPaidAmount.toFixed(2) : '0.00',
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

  async updateDraftTab(draftTabId: number, userId: number, payload: UpdatePosDraftTabDto) {
    const draftTab = await this.getDraftTabOrThrow(draftTabId, userId);

    if (payload.tabType !== undefined) draftTab.tabType = payload.tabType;
    if (payload.title !== undefined) draftTab.title = payload.title;
    if (payload.saleMode !== undefined) draftTab.saleMode = payload.saleMode;
    if (payload.customerName !== undefined) draftTab.customerName = payload.customerName ?? null;
    if (payload.customerPhone !== undefined) draftTab.customerPhone = payload.customerPhone ?? null;
    if (payload.customerId !== undefined) draftTab.customerId = payload.customerId ?? null;
    if (payload.note !== undefined) draftTab.note = payload.note ?? null;
    if (payload.paymentMethod !== undefined) draftTab.paymentMethod = payload.paymentMethod;
    if (payload.customerPaidAmount !== undefined) draftTab.customerPaidAmount = payload.customerPaidAmount.toFixed(2);
    if (payload.discountAmount !== undefined) draftTab.discountAmount = payload.discountAmount.toFixed(2);
    if (payload.redeemedPoints !== undefined) draftTab.redeemedPoints = payload.redeemedPoints;
    if (payload.sourceSalesOrderId !== undefined) draftTab.sourceSalesOrderId = payload.sourceSalesOrderId ?? null;
    if (payload.importDate !== undefined) draftTab.importDate = payload.importDate ?? null;
    if (payload.purchaseOrderCode !== undefined) draftTab.purchaseOrderCode = payload.purchaseOrderCode ?? null;
    if (payload.supplierId !== undefined) draftTab.supplierId = payload.supplierId ?? null;
    if (payload.supplierOrderCode !== undefined) draftTab.supplierOrderCode = payload.supplierOrderCode ?? null;
    if (payload.supplierInvoiceCode !== undefined) draftTab.supplierInvoiceCode = payload.supplierInvoiceCode ?? null;
    if (payload.purchaseStatus !== undefined) draftTab.purchaseStatus = payload.purchaseStatus ?? null;
    if (payload.supplierPaidAmount !== undefined) draftTab.supplierPaidAmount = payload.supplierPaidAmount.toFixed(2);
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

  async getDraftTabOrThrow(draftTabId: number, userId: number) {
    const draftTab = await this.posDraftTabRepository.findOne({
      where: { id: draftTabId, createdByUserId: userId },
      relations: { items: true },
      order: { items: { sortOrder: 'ASC' } },
    });

    if (!draftTab) throw new NotFoundException('Draft tab not found');
    return draftTab;
  }

  private async replaceDraftTabItems(draftTabId: number, items: PosDraftItemDto[]) {
    await this.posDraftTabItemRepository.delete({ posDraftTabId: draftTabId });

    if (!items.length) return;

    const productUnits = await this.productUnitRepository.find({
      where: items.map((item) => ({ id: item.productUnitId, productId: item.productId, isActive: true })),
      relations: { product: true, unit: true },
    });

    const productUnitMap = new Map(productUnits.map((item) => [item.id, item]));

    const entities = items.map((item, index) => {
      const productUnit = productUnitMap.get(item.productUnitId);
      if (!productUnit || productUnit.product.id !== item.productId) {
        throw new BadRequestException(`Invalid product unit at items[${index}]`);
      }

      const lineTotal = Number((item.quantity * item.unitPrice - item.discountAmount).toFixed(2));
      if (lineTotal < 0) throw new BadRequestException(`Invalid line total at items[${index}]`);

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

  private async buildStockMapForTabs(tabs: PosDraftTab[]) {
    const allIds = new Set<number>();
    for (const tab of tabs) {
      for (const item of tab.items ?? []) {
        allIds.add(item.productId);
      }
    }
    if (!allIds.size) return new Map();

    const ids = [...allIds];
    const products = await this.productRepository.find({
      where: { id: In(ids) },
      select: { id: true, stockOnHand: true },
    });
    return new Map(products.map((p) => [p.id, Number(p.stockOnHand)]));
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
      customerId: tab.customerId,
      note: tab.note,
      paymentMethod: tab.paymentMethod,
      customerPaidAmount: Number(tab.customerPaidAmount),
      discountAmount: Number(tab.discountAmount),
      redeemedPoints: tab.redeemedPoints ?? 0,
      sourceSalesOrderId: tab.sourceSalesOrderId,
      importDate: tab.importDate,
      purchaseOrderCode: tab.purchaseOrderCode,
      supplierId: tab.supplierId,
      supplierOrderCode: tab.supplierOrderCode,
      supplierInvoiceCode: tab.supplierInvoiceCode,
      purchaseStatus: tab.purchaseStatus,
      supplierPaidAmount: Number(tab.supplierPaidAmount ?? 0),
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
}
