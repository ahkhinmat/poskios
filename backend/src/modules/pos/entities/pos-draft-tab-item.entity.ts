import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PosDraftTab } from './pos-draft-tab.entity';

@Entity({ name: 'PosDraftTabItems' })
export class PosDraftTabItem {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'PosDraftTabId', type: 'int' })
  posDraftTabId!: number;

  @Column({ name: 'ProductId', type: 'int' })
  productId!: number;

  @Column({ name: 'ProductUnitId', type: 'int' })
  productUnitId!: number;

  @Column({ name: 'ProductCodeSnapshot', type: 'nvarchar', length: 50 })
  productCodeSnapshot!: string;

  @Column({ name: 'BarcodeSnapshot', type: 'nvarchar', length: 50, nullable: true })
  barcodeSnapshot!: string | null;

  @Column({ name: 'ProductNameSnapshot', type: 'nvarchar', length: 255 })
  productNameSnapshot!: string;

  @Column({ name: 'UnitId', type: 'int' })
  unitId!: number;

  @Column({ name: 'UnitNameSnapshot', type: 'nvarchar', length: 100 })
  unitNameSnapshot!: string;

  @Column({ name: 'ConversionValue', type: 'decimal', precision: 18, scale: 3 })
  conversionValue!: string;

  @Column({ name: 'Quantity', type: 'decimal', precision: 18, scale: 3 })
  quantity!: string;

  @Column({ name: 'UnitPrice', type: 'decimal', precision: 18, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'DiscountAmount', type: 'decimal', precision: 18, scale: 2 })
  discountAmount!: string;

  @Column({ name: 'LineTotal', type: 'decimal', precision: 18, scale: 2 })
  lineTotal!: string;

  @Column({ name: 'Note', type: 'nvarchar', length: 255, nullable: true })
  note!: string | null;

  @Column({ name: 'SortOrder', type: 'int' })
  sortOrder!: number;

  @ManyToOne(() => PosDraftTab, (tab) => tab.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'PosDraftTabId' })
  posDraftTab!: PosDraftTab;
}
