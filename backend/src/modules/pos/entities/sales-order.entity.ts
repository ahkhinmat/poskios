import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalNumberTransformer } from './decimal.transformer';

@Entity({ name: 'SalesOrders' })
export class SalesOrder {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'CreatedByUserId', type: 'int' })
  createdByUserId!: number;

  @Column({ name: 'CancelledByUserId', type: 'int', nullable: true })
  cancelledByUserId!: number | null;

  @Column({ name: 'SourceSalesOrderId', type: 'int', nullable: true })
  sourceSalesOrderId!: number | null;

  @Column({ name: 'CustomerId', type: 'int', nullable: true })
  customerId!: number | null;

  @Column({ name: 'SalesOrderCode', type: 'varchar', length: 50 })
  salesOrderCode!: string;

  @Column({ name: 'OrderType', type: 'varchar', length: 30 })
  orderType!: string;

  @Column({ name: 'Status', type: 'varchar', length: 30 })
  status!: string;

  @Column({ name: 'SaleMode', type: 'varchar', length: 30 })
  saleMode!: string;

  @Column({ name: 'PaymentMethod', type: 'varchar', length: 30 })
  paymentMethod!: string;

  @Column({ name: 'CustomerName', type: 'varchar', length: 150, nullable: true })
  customerName!: string | null;

  @Column({ name: 'CustomerPhone', type: 'varchar', length: 30, nullable: true })
  customerPhone!: string | null;

  @Column({
    name: 'RedeemedPoints',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  redeemedPoints!: number | null;

  @Column({
    name: 'EarnedPoints',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  earnedPoints!: number | null;

  @Column({
    name: 'LoyaltyDiscountAmount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  loyaltyDiscountAmount!: number | null;

  @Column({ name: 'Notes', type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'SubtotalAmount', type: 'numeric', precision: 18, scale: 2 })
  subtotalAmount!: string;

  @Column({ name: 'DiscountAmount', type: 'numeric', precision: 18, scale: 2 })
  discountAmount!: string;

  @Column({ name: 'ReturnFeeAmount', type: 'numeric', precision: 18, scale: 2 })
  returnFeeAmount!: string;

  @Column({ name: 'TotalAmount', type: 'numeric', precision: 18, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'CustomerPaidAmount', type: 'numeric', precision: 18, scale: 2 })
  customerPaidAmount!: string;

  @Column({ name: 'ChangeAmount', type: 'numeric', precision: 18, scale: 2 })
  changeAmount!: string;

  @Column({ name: 'SoldAt', type: 'timestamp' })
  soldAt!: Date;

  @Column({ name: 'CancelledAt', type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;
}
