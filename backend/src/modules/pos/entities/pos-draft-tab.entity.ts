import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PosDraftTabItem } from './pos-draft-tab-item.entity';

@Entity({ name: 'PosDraftTabs' })
export class PosDraftTab {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'CreatedByUserId', type: 'int' })
  createdByUserId!: number;

  @Column({ name: 'TabCode', type: 'nvarchar', length: 50 })
  tabCode!: string;

  @Column({ name: 'TabType', type: 'nvarchar', length: 30 })
  tabType!: string;

  @Column({ name: 'Title', type: 'nvarchar', length: 100 })
  title!: string;

  @Column({ name: 'SaleMode', type: 'nvarchar', length: 30 })
  saleMode!: string;

  @Column({ name: 'CustomerName', type: 'nvarchar', length: 150, nullable: true })
  customerName!: string | null;

  @Column({ name: 'CustomerPhone', type: 'nvarchar', length: 30, nullable: true })
  customerPhone!: string | null;

  @Column({ name: 'Note', type: 'nvarchar', length: 500, nullable: true })
  note!: string | null;

  @Column({ name: 'PaymentMethod', type: 'nvarchar', length: 30 })
  paymentMethod!: string;

  @Column({
    name: 'CustomerPaidAmount',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  customerPaidAmount!: string;

  @Column({
    name: 'DiscountAmount',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  discountAmount!: string;

  @Column({ name: 'SourceSalesOrderId', type: 'int', nullable: true })
  sourceSalesOrderId!: number | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;

  @Column({ name: 'LastTouchedAt', type: 'datetime2' })
  lastTouchedAt!: Date;

  @OneToMany(() => PosDraftTabItem, (item) => item.posDraftTab, {
    cascade: false,
  })
  items!: PosDraftTabItem[];
}
