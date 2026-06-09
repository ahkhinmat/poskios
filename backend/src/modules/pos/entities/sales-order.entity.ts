import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ name: 'SalesOrderCode', type: 'nvarchar', length: 50 })
  salesOrderCode!: string;

  @Column({ name: 'OrderType', type: 'nvarchar', length: 30 })
  orderType!: string;

  @Column({ name: 'Status', type: 'nvarchar', length: 30 })
  status!: string;

  @Column({ name: 'SaleMode', type: 'nvarchar', length: 30 })
  saleMode!: string;

  @Column({ name: 'PaymentMethod', type: 'nvarchar', length: 30 })
  paymentMethod!: string;

  @Column({ name: 'CustomerName', type: 'nvarchar', length: 150, nullable: true })
  customerName!: string | null;

  @Column({ name: 'CustomerPhone', type: 'nvarchar', length: 30, nullable: true })
  customerPhone!: string | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'SubtotalAmount', type: 'decimal', precision: 18, scale: 2 })
  subtotalAmount!: string;

  @Column({ name: 'DiscountAmount', type: 'decimal', precision: 18, scale: 2 })
  discountAmount!: string;

  @Column({ name: 'ReturnFeeAmount', type: 'decimal', precision: 18, scale: 2 })
  returnFeeAmount!: string;

  @Column({ name: 'TotalAmount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'CustomerPaidAmount', type: 'decimal', precision: 18, scale: 2 })
  customerPaidAmount!: string;

  @Column({ name: 'ChangeAmount', type: 'decimal', precision: 18, scale: 2 })
  changeAmount!: string;

  @Column({ name: 'SoldAt', type: 'datetime2' })
  soldAt!: Date;

  @Column({ name: 'CancelledAt', type: 'datetime2', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;
}
