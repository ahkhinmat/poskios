import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PurchaseOrders' })
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'SupplierId', type: 'int', nullable: true })
  supplierId!: number | null;

  @Column({ name: 'CreatedByUserId', type: 'int' })
  createdByUserId!: number;

  @Column({ name: 'ApprovedByUserId', type: 'int', nullable: true })
  approvedByUserId!: number | null;

  @Column({ name: 'PurchaseOrderCode', type: 'nvarchar', length: 50 })
  purchaseOrderCode!: string;

  @Column({ name: 'SupplierNameSnapshot', type: 'nvarchar', length: 150, nullable: true })
  supplierNameSnapshot!: string | null;

  @Column({ name: 'Status', type: 'nvarchar', length: 30 })
  status!: string;

  @Column({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'SubtotalAmount', type: 'decimal', precision: 18, scale: 2 })
  subtotalAmount!: string;

  @Column({ name: 'DiscountAmount', type: 'decimal', precision: 18, scale: 2 })
  discountAmount!: string;

  @Column({ name: 'TotalAmount', type: 'decimal', precision: 18, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'OrderedAt', type: 'datetime2' })
  orderedAt!: Date;

  @Column({ name: 'ConfirmedAt', type: 'datetime2', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;
}
