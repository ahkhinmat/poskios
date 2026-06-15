import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UpdateLoyaltySettingsDto } from '../dto/update-loyalty-settings.dto';
import { Customer } from '../entities/customer.entity';
import { LoyaltyPointTransaction } from '../entities/loyalty-point-transaction.entity';
import { Setting } from '../entities/setting.entity';

@Injectable()
export class CustomerLoyaltyService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(LoyaltyPointTransaction)
    private readonly loyaltyPointTransactionRepository: Repository<LoyaltyPointTransaction>,
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async getCustomerByPhone(phone?: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) return null;

    const customer = await this.customerRepository.findOne({
      where: { phoneNumber: normalizedPhone, isActive: true },
    });

    if (!customer) return null;

    return {
      id: customer.id, phoneNumber: customer.phoneNumber, fullName: customer.fullName, currentPoints: Number(customer.currentPoints),
    };
  }

  async searchCustomers(keyword?: string) {
    const rawKeyword = String(keyword ?? '').trim();
    if (!rawKeyword) return { items: [] };

    const normalizedPhone = this.normalizePhone(rawKeyword);
    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.isActive = :isActive', { isActive: true });

    qb.andWhere(new Brackets((subQb) => {
      if (normalizedPhone) subQb.where('customer.phoneNumber LIKE :phoneKeyword', { phoneKeyword: `%${normalizedPhone}%` });
      subQb.orWhere('customer.fullName LIKE :nameKeyword', { nameKeyword: `%${rawKeyword}%` });
    }));

    const customers = await qb.orderBy('customer.fullName', 'ASC').addOrderBy('customer.id', 'DESC').take(10).getMany();

    return {
      items: customers.map((customer) => ({
        id: customer.id, phoneNumber: customer.phoneNumber, fullName: customer.fullName, currentPoints: Number(customer.currentPoints),
      })),
    };
  }

  async upsertCustomerByPhone(input: { phoneNumber?: string | null; fullName?: string | null }) {
    const phoneNumber = this.normalizePhone(input.phoneNumber);
    const fullName = String(input.fullName ?? '').trim();

    if (!phoneNumber) throw new BadRequestException('Phone number is required');
    if (!fullName) throw new BadRequestException('Customer name is required');

    let customer = await this.customerRepository.findOne({ where: { phoneNumber } });

    if (!customer) {
      customer = this.customerRepository.create({ phoneNumber, fullName, currentPoints: 0, isActive: true });
    } else {
      customer.fullName = fullName;
      customer.isActive = true;
    }

    const saved = await this.customerRepository.save(customer);

    return {
      id: saved.id, phoneNumber: saved.phoneNumber, fullName: saved.fullName, currentPoints: Number(saved.currentPoints),
    };
  }

  async getCustomerPointHistory(customerId: number) {
    const customer = await this.customerRepository.findOne({ where: { id: customerId, isActive: true } });
    if (!customer) throw new NotFoundException('Customer not found');

    const items = await this.loyaltyPointTransactionRepository.find({
      where: { customerId },
      order: { transactionAt: 'DESC', id: 'DESC' },
      take: 50,
    });

    return {
      customer: { id: customer.id, phoneNumber: customer.phoneNumber, fullName: customer.fullName, currentPoints: Number(customer.currentPoints) },
      items: items.map((item) => ({
        id: item.id, salesOrderId: item.salesOrderId, transactionType: item.transactionType,
        pointsChange: item.pointsChange, balanceAfter: item.balanceAfter,
        amountBasis: item.amountBasis ? Number(item.amountBasis) : null, expireAt: item.expireAt,
        notes: item.notes, transactionAt: item.transactionAt,
      })),
    };
  }

  async getLoyaltySettings() {
    const setting = await this.getOrCreateSetting();
    return this.toLoyaltySettingsResponse(setting);
  }

  async updateLoyaltySettings(payload: UpdateLoyaltySettingsDto) {
    const setting = await this.getOrCreateSetting();

    if (payload.earnAmountPerPoint !== undefined) setting.loyaltyEarnAmountPerPoint = payload.earnAmountPerPoint.toFixed(2);
    if (payload.redeemAmountPerPoint !== undefined) setting.loyaltyRedeemAmountPerPoint = payload.redeemAmountPerPoint.toFixed(2);
    if (payload.minimumRedeemPoints !== undefined) setting.loyaltyMinimumRedeemPoints = payload.minimumRedeemPoints;
    if (payload.pointsExpiryDays !== undefined) setting.loyaltyPointsExpiryDays = payload.pointsExpiryDays;

    const saved = await this.settingRepository.save(setting);
    return this.toLoyaltySettingsResponse(saved);
  }

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

  private toLoyaltySettingsResponse(setting: Setting) {
    return {
      earnAmountPerPoint: Number(setting.loyaltyEarnAmountPerPoint ?? '10000'),
      redeemAmountPerPoint: Number(setting.loyaltyRedeemAmountPerPoint ?? '1000'),
      minimumRedeemPoints: Number(setting.loyaltyMinimumRedeemPoints ?? 10),
      pointsExpiryDays: setting.loyaltyPointsExpiryDays ?? null,
    };
  }

  private normalizePhone(phone?: string | null) {
    const digits = String(phone ?? '').replace(/\D+/g, '');
    return digits || null;
  }
}
