import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async getOrCreateSetting() {
    const existing = await this.settingRepository.findOne({ where: {}, order: { id: 'ASC' } });
    if (existing) return existing;
    return this.settingRepository.save(this.settingRepository.create({
      storeName: 'KA MART', storeAddress: null, storePhoneNumber: null,
      receiptHeader: null, receiptFooter: null,
      loyaltyEarnAmountPerPoint: '10000.00', loyaltyRedeemAmountPerPoint: '1000.00',
      loyaltyMinimumRedeemPoints: 10, loyaltyPointsExpiryDays: null,
    }));
  }

  async getAllSettings() {
    const setting = await this.getOrCreateSetting();
    return {
      storeName: setting.storeName,
      storeAddress: setting.storeAddress ?? '',
      storePhoneNumber: setting.storePhoneNumber ?? '',
      receiptHeader: setting.receiptHeader ?? '',
      receiptFooter: setting.receiptFooter ?? '',
      loyaltyEarnAmountPerPoint: Number(setting.loyaltyEarnAmountPerPoint ?? '10000'),
      loyaltyRedeemAmountPerPoint: Number(setting.loyaltyRedeemAmountPerPoint ?? '1000'),
      loyaltyMinimumRedeemPoints: Number(setting.loyaltyMinimumRedeemPoints ?? 10),
      loyaltyPointsExpiryDays: setting.loyaltyPointsExpiryDays ?? null,
    };
  }

  async updateSettings(payload: UpdateSettingsDto) {
    const setting = await this.getOrCreateSetting();

    if (payload.storeName !== undefined) setting.storeName = payload.storeName;
    if (payload.storeAddress !== undefined) setting.storeAddress = payload.storeAddress || null;
    if (payload.storePhoneNumber !== undefined) setting.storePhoneNumber = payload.storePhoneNumber || null;
    if (payload.receiptHeader !== undefined) setting.receiptHeader = payload.receiptHeader || null;
    if (payload.receiptFooter !== undefined) setting.receiptFooter = payload.receiptFooter || null;
    if (payload.loyaltyEarnAmountPerPoint !== undefined) setting.loyaltyEarnAmountPerPoint = payload.loyaltyEarnAmountPerPoint?.toFixed(2) ?? null;
    if (payload.loyaltyRedeemAmountPerPoint !== undefined) setting.loyaltyRedeemAmountPerPoint = payload.loyaltyRedeemAmountPerPoint?.toFixed(2) ?? null;
    if (payload.loyaltyMinimumRedeemPoints !== undefined) setting.loyaltyMinimumRedeemPoints = payload.loyaltyMinimumRedeemPoints ?? null;
    if (payload.loyaltyPointsExpiryDays !== undefined) setting.loyaltyPointsExpiryDays = payload.loyaltyPointsExpiryDays ?? null;

    const saved = await this.settingRepository.save(setting);
    return {
      storeName: saved.storeName,
      storeAddress: saved.storeAddress ?? '',
      storePhoneNumber: saved.storePhoneNumber ?? '',
      receiptHeader: saved.receiptHeader ?? '',
      receiptFooter: saved.receiptFooter ?? '',
      loyaltyEarnAmountPerPoint: Number(saved.loyaltyEarnAmountPerPoint ?? '10000'),
      loyaltyRedeemAmountPerPoint: Number(saved.loyaltyRedeemAmountPerPoint ?? '1000'),
      loyaltyMinimumRedeemPoints: Number(saved.loyaltyMinimumRedeemPoints ?? 10),
      loyaltyPointsExpiryDays: saved.loyaltyPointsExpiryDays ?? null,
    };
  }
}
