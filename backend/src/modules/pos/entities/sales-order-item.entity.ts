import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'SalesOrderItems' })
export class SalesOrderItem {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SalesOrderId', type: 'int' })
  salesOrderId!: number;

  @Column({ name: 'ProductId', type: 'int' })
  productId!: number;

  @Column({ name: 'ProductUnitId', type: 'int' })
  productUnitId!: number;

  @Column({ name: 'ProductCodeSnapshot', type: 'varchar', length: 50 })
  productCodeSnapshot!: string;

  @Column({ name: 'BarcodeSnapshot', type: 'varchar', length: 50, nullable: true })
  barcodeSnapshot!: string | null;

  @Column({ name: 'ProductNameSnapshot', type: 'varchar', length: 255 })
  productNameSnapshot!: string;

  @Column({ name: 'UnitNameSnapshot', type: 'varchar', length: 100, nullable: true })
  unitNameSnapshot!: string | null;

  @Column({ name: 'ConversionValue', type: 'numeric', precision: 18, scale: 3 })
  conversionValue!: string;

  @Column({ name: 'Quantity', type: 'numeric', precision: 18, scale: 3 })
  quantity!: string;

  @Column({ name: 'CostPrice', type: 'numeric', precision: 18, scale: 2 })
  costPrice!: string;

  @Column({ name: 'UnitPrice', type: 'numeric', precision: 18, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'DiscountAmount', type: 'numeric', precision: 18, scale: 2 })
  discountAmount!: string;

  @Column({ name: 'LineTotal', type: 'numeric', precision: 18, scale: 2 })
  lineTotal!: string;

  @Column({ name: 'Notes', type: 'varchar', length: 255, nullable: true })
  notes!: string | null;
}
