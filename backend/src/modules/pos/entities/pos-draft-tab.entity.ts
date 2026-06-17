import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PosDraftTabItem } from './pos-draft-tab-item.entity';
import { decimalNumberTransformer } from './decimal.transformer';

@Entity({ name: 'PosDraftTabs' })
export class PosDraftTab {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'CreatedByUserId', type: 'int' })
  createdByUserId!: number;

  @Column({ name: 'TabCode', type: 'varchar', length: 50 })
  tabCode!: string;

  @Column({ name: 'TabType', type: 'varchar', length: 30 })
  tabType!: string;

  @Column({ name: 'Title', type: 'varchar', length: 100 })
  title!: string;

  @Column({ name: 'SaleMode', type: 'varchar', length: 30 })
  saleMode!: string;

  @Column({ name: 'CustomerName', type: 'varchar', length: 150, nullable: true })
  customerName!: string | null;

  @Column({ name: 'CustomerPhone', type: 'varchar', length: 30, nullable: true })
  customerPhone!: string | null;

  @Column({ name: 'CustomerId', type: 'int', nullable: true })
  customerId!: number | null;

  @Column({
    name: 'RedeemedPoints',
    type: 'numeric',
    precision: 18,
    scale: 4,
    nullable: true,
    transformer: decimalNumberTransformer,
  })
  redeemedPoints!: number | null;

  @Column({ name: 'Note', type: 'varchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'PaymentMethod', type: 'varchar', length: 30 })
  paymentMethod!: string;

  @Column({
    name: 'CustomerPaidAmount',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  customerPaidAmount!: string;

  @Column({
    name: 'DiscountAmount',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  discountAmount!: string;

  @Column({ name: 'SourceSalesOrderId', type: 'int', nullable: true })
  sourceSalesOrderId!: number | null;

  @Column({ name: 'ImportDate', type: 'date', nullable: true })
  importDate!: string | null;

  @Column({ name: 'PurchaseOrderCode', type: 'varchar', length: 50, nullable: true })
  purchaseOrderCode!: string | null;

  @Column({ name: 'SupplierId', type: 'int', nullable: true })
  supplierId!: number | null;

  @Column({ name: 'SupplierOrderCode', type: 'varchar', length: 50, nullable: true })
  supplierOrderCode!: string | null;

  @Column({ name: 'SupplierInvoiceCode', type: 'varchar', length: 50, nullable: true })
  supplierInvoiceCode!: string | null;

  @Column({ name: 'PurchaseStatus', type: 'varchar', length: 30, nullable: true })
  purchaseStatus!: string | null;

  @Column({
    name: 'SupplierPaidAmount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  supplierPaidAmount!: string | null;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;

  @Column({ name: 'LastTouchedAt', type: 'timestamp' })
  lastTouchedAt!: Date;

  @OneToMany(() => PosDraftTabItem, (item) => item.posDraftTab, {
    cascade: false,
  })
  items!: PosDraftTabItem[];
}
