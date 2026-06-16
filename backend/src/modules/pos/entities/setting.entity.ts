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

  @Column({ name: 'CurrencySuffix', type: 'nvarchar', length: 10 })
  currencySuffix!: string;

  @Column({ name: 'Locale', type: 'nvarchar', length: 10 })
  locale!: string;

  @Column({ name: 'ReceiptPaperWidth', type: 'nvarchar', length: 10 })
  receiptPaperWidth!: string;

  @Column({ name: 'ReceiptPoweredBy', type: 'nvarchar', length: 200 })
  receiptPoweredBy!: string;

  @Column({ name: 'DefaultPaymentMethod', type: 'nvarchar', length: 20 })
  defaultPaymentMethod!: string;

  @Column({ name: 'QuickPayAmount1', type: 'decimal', precision: 18, scale: 0 })
  quickPayAmount1!: number;

  @Column({ name: 'QuickPayAmount2', type: 'decimal', precision: 18, scale: 0 })
  quickPayAmount2!: number;

  @Column({ name: 'QuickPayAmount3', type: 'decimal', precision: 18, scale: 0 })
  quickPayAmount3!: number;

  @Column({ name: 'SalesOrderPrefix', type: 'nvarchar', length: 10 })
  salesOrderPrefix!: string;

  @Column({ name: 'ReturnOrderPrefix', type: 'nvarchar', length: 10 })
  returnOrderPrefix!: string;

  @Column({ name: 'PurchaseOrderPrefix', type: 'nvarchar', length: 10 })
  purchaseOrderPrefix!: string;

  @Column({ name: 'ProductSearchMaxResults', type: 'int' })
  productSearchMaxResults!: number;

  @Column({ name: 'InvoiceSearchMaxResults', type: 'int' })
  invoiceSearchMaxResults!: number;

  @Column({ name: 'CustomerSearchMaxResults', type: 'int' })
  customerSearchMaxResults!: number;

  @Column({ name: 'DefaultAddQuantity', type: 'decimal', precision: 18, scale: 2 })
  defaultAddQuantity!: number;

  @Column({ name: 'OverviewPassword', type: 'nvarchar', length: 50 })
  overviewPassword!: string;

  @Column({ name: 'CashierLabel', type: 'nvarchar', length: 50 })
  cashierLabel!: string;

  @Column({ name: 'ProductManagerPageSize', type: 'int', nullable: true, default: 30 })
  productManagerPageSize!: number | null;

  @Column({ name: 'SearchDebounceMs', type: 'int', nullable: true, default: 250 })
  searchDebounceMs!: number | null;

  @Column({ name: 'AutoSaveDebounceMs', type: 'int', nullable: true, default: 500 })
  autoSaveDebounceMs!: number | null;

  @Column({ name: 'PaymentMethods', type: 'nvarchar', length: 500, nullable: true })
  paymentMethods!: string | null;

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
