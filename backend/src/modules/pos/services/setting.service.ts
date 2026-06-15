import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

const DEFAULTS = {
  storeName: 'KA MART',
  storeAddress: null,
  storePhoneNumber: null,
  receiptHeader: null,
  receiptFooter: null,
  currencySuffix: 'đ',
  locale: 'vi-VN',
  receiptPaperWidth: '76mm',
  receiptPoweredBy: 'Powered by KIOTVIET',
  defaultPaymentMethod: 'CASH',
  quickPayAmount1: 100000,
  quickPayAmount2: 200000,
  quickPayAmount3: 500000,
  salesOrderPrefix: 'HD',
  returnOrderPrefix: 'TH',
  purchaseOrderPrefix: 'PNH',
  productSearchMaxResults: 8,
  invoiceSearchMaxResults: 20,
  customerSearchMaxResults: 10,
  defaultAddQuantity: 1,
  overviewPassword: '11111',
  cashierLabel: 'Thu ngân',
  loyaltyEarnAmountPerPoint: '10000.00',
  loyaltyRedeemAmountPerPoint: '1000.00',
  loyaltyMinimumRedeemPoints: 10,
  loyaltyPointsExpiryDays: null,
};

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async getOrCreateSetting() {
    const existing = await this.settingRepository.findOne({ where: {}, order: { id: 'ASC' } });
    if (existing) return existing;
    return this.settingRepository.save(this.settingRepository.create({ ...DEFAULTS }));
  }

  async getAllSettings() {
    const s = await this.getOrCreateSetting();
    return {
      storeName: s.storeName,
      storeAddress: s.storeAddress ?? '',
      storePhoneNumber: s.storePhoneNumber ?? '',
      receiptHeader: s.receiptHeader ?? '',
      receiptFooter: s.receiptFooter ?? '',
      currencySuffix: s.currencySuffix,
      locale: s.locale,
      receiptPaperWidth: s.receiptPaperWidth,
      receiptPoweredBy: s.receiptPoweredBy,
      defaultPaymentMethod: s.defaultPaymentMethod,
      quickPayAmount1: Number(s.quickPayAmount1),
      quickPayAmount2: Number(s.quickPayAmount2),
      quickPayAmount3: Number(s.quickPayAmount3),
      salesOrderPrefix: s.salesOrderPrefix,
      returnOrderPrefix: s.returnOrderPrefix,
      purchaseOrderPrefix: s.purchaseOrderPrefix,
      productSearchMaxResults: s.productSearchMaxResults,
      invoiceSearchMaxResults: s.invoiceSearchMaxResults,
      customerSearchMaxResults: s.customerSearchMaxResults,
      defaultAddQuantity: Number(s.defaultAddQuantity),
      overviewPassword: s.overviewPassword,
      cashierLabel: s.cashierLabel,
      loyaltyEarnAmountPerPoint: Number(s.loyaltyEarnAmountPerPoint ?? '10000'),
      loyaltyRedeemAmountPerPoint: Number(s.loyaltyRedeemAmountPerPoint ?? '1000'),
      loyaltyMinimumRedeemPoints: Number(s.loyaltyMinimumRedeemPoints ?? 10),
      loyaltyPointsExpiryDays: s.loyaltyPointsExpiryDays ?? null,
    };
  }

  async updateSettings(payload: UpdateSettingsDto) {
    const s = await this.getOrCreateSetting();

    if (payload.storeName !== undefined) s.storeName = payload.storeName;
    if (payload.storeAddress !== undefined) s.storeAddress = payload.storeAddress || null;
    if (payload.storePhoneNumber !== undefined) s.storePhoneNumber = payload.storePhoneNumber || null;
    if (payload.receiptHeader !== undefined) s.receiptHeader = payload.receiptHeader || null;
    if (payload.receiptFooter !== undefined) s.receiptFooter = payload.receiptFooter || null;
    if (payload.currencySuffix !== undefined) s.currencySuffix = payload.currencySuffix;
    if (payload.locale !== undefined) s.locale = payload.locale;
    if (payload.receiptPaperWidth !== undefined) s.receiptPaperWidth = payload.receiptPaperWidth;
    if (payload.receiptPoweredBy !== undefined) s.receiptPoweredBy = payload.receiptPoweredBy;
    if (payload.defaultPaymentMethod !== undefined) s.defaultPaymentMethod = payload.defaultPaymentMethod;
    if (payload.quickPayAmount1 !== undefined) s.quickPayAmount1 = payload.quickPayAmount1;
    if (payload.quickPayAmount2 !== undefined) s.quickPayAmount2 = payload.quickPayAmount2;
    if (payload.quickPayAmount3 !== undefined) s.quickPayAmount3 = payload.quickPayAmount3;
    if (payload.salesOrderPrefix !== undefined) s.salesOrderPrefix = payload.salesOrderPrefix;
    if (payload.returnOrderPrefix !== undefined) s.returnOrderPrefix = payload.returnOrderPrefix;
    if (payload.purchaseOrderPrefix !== undefined) s.purchaseOrderPrefix = payload.purchaseOrderPrefix;
    if (payload.productSearchMaxResults !== undefined) s.productSearchMaxResults = payload.productSearchMaxResults;
    if (payload.invoiceSearchMaxResults !== undefined) s.invoiceSearchMaxResults = payload.invoiceSearchMaxResults;
    if (payload.customerSearchMaxResults !== undefined) s.customerSearchMaxResults = payload.customerSearchMaxResults;
    if (payload.defaultAddQuantity !== undefined) s.defaultAddQuantity = payload.defaultAddQuantity;
    if (payload.overviewPassword !== undefined) s.overviewPassword = payload.overviewPassword;
    if (payload.cashierLabel !== undefined) s.cashierLabel = payload.cashierLabel;
    if (payload.loyaltyEarnAmountPerPoint !== undefined) s.loyaltyEarnAmountPerPoint = payload.loyaltyEarnAmountPerPoint?.toFixed(2) ?? null;
    if (payload.loyaltyRedeemAmountPerPoint !== undefined) s.loyaltyRedeemAmountPerPoint = payload.loyaltyRedeemAmountPerPoint?.toFixed(2) ?? null;
    if (payload.loyaltyMinimumRedeemPoints !== undefined) s.loyaltyMinimumRedeemPoints = payload.loyaltyMinimumRedeemPoints ?? null;
    if (payload.loyaltyPointsExpiryDays !== undefined) s.loyaltyPointsExpiryDays = payload.loyaltyPointsExpiryDays ?? null;

    const saved = await this.settingRepository.save(s);
    return {
      storeName: saved.storeName,
      storeAddress: saved.storeAddress ?? '',
      storePhoneNumber: saved.storePhoneNumber ?? '',
      receiptHeader: saved.receiptHeader ?? '',
      receiptFooter: saved.receiptFooter ?? '',
      currencySuffix: saved.currencySuffix,
      locale: saved.locale,
      receiptPaperWidth: saved.receiptPaperWidth,
      receiptPoweredBy: saved.receiptPoweredBy,
      defaultPaymentMethod: saved.defaultPaymentMethod,
      quickPayAmount1: Number(saved.quickPayAmount1),
      quickPayAmount2: Number(saved.quickPayAmount2),
      quickPayAmount3: Number(saved.quickPayAmount3),
      salesOrderPrefix: saved.salesOrderPrefix,
      returnOrderPrefix: saved.returnOrderPrefix,
      purchaseOrderPrefix: saved.purchaseOrderPrefix,
      productSearchMaxResults: saved.productSearchMaxResults,
      invoiceSearchMaxResults: saved.invoiceSearchMaxResults,
      customerSearchMaxResults: saved.customerSearchMaxResults,
      defaultAddQuantity: Number(saved.defaultAddQuantity),
      overviewPassword: saved.overviewPassword,
      cashierLabel: saved.cashierLabel,
      loyaltyEarnAmountPerPoint: Number(saved.loyaltyEarnAmountPerPoint ?? '10000'),
      loyaltyRedeemAmountPerPoint: Number(saved.loyaltyRedeemAmountPerPoint ?? '1000'),
      loyaltyMinimumRedeemPoints: Number(saved.loyaltyMinimumRedeemPoints ?? 10),
      loyaltyPointsExpiryDays: saved.loyaltyPointsExpiryDays ?? null,
    };
  }
}
