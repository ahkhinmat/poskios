import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities/setting.entity';

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
}
