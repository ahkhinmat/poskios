import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalNumberTransformer } from './decimal.transformer';

@Entity({ name: 'Settings' })
export class Setting {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'StoreName', type: 'nvarchar', length: 150 })
  storeName!: string;

  @Column({ name: 'StoreAddress', type: 'nvarchar', length: 255, nullable: true })
  storeAddress!: string | null;

  @Column({ name: 'StorePhoneNumber', type: 'nvarchar', length: 30, nullable: true })
  storePhoneNumber!: string | null;

  @Column({ name: 'ReceiptHeader', type: 'nvarchar', length: 500, nullable: true })
  receiptHeader!: string | null;

  @Column({ name: 'ReceiptFooter', type: 'nvarchar', length: 500, nullable: true })
  receiptFooter!: string | null;

  @Column({
    name: 'LoyaltyEarnAmountPerPoint',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  loyaltyEarnAmountPerPoint!: string | null;

  @Column({
    name: 'LoyaltyRedeemAmountPerPoint',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  loyaltyRedeemAmountPerPoint!: string | null;

  @Column({
    name: 'LoyaltyMinimumRedeemPoints',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  loyaltyMinimumRedeemPoints!: number | null;

  @Column({ name: 'LoyaltyPointsExpiryDays', type: 'int', nullable: true })
  loyaltyPointsExpiryDays!: number | null;
}
