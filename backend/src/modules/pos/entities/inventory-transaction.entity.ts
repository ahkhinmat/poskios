import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'InventoryTransactions' })
export class InventoryTransaction {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'ProductId', type: 'int' })
  productId!: number;

  @Column({ name: 'PurchaseOrderId', type: 'int', nullable: true })
  purchaseOrderId!: number | null;

  @Column({ name: 'SalesOrderId', type: 'int', nullable: true })
  salesOrderId!: number | null;

  @Column({ name: 'CreatedByUserId', type: 'int', nullable: true })
  createdByUserId!: number | null;

  @Column({ name: 'TransactionType', type: 'nvarchar', length: 30 })
  transactionType!: string;

  @Column({ name: 'ReferenceCode', type: 'nvarchar', length: 50, nullable: true })
  referenceCode!: string | null;

  @Column({ name: 'QuantityChange', type: 'decimal', precision: 18, scale: 3 })
  quantityChange!: string;

  @Column({ name: 'StockBefore', type: 'decimal', precision: 18, scale: 3 })
  stockBefore!: string;

  @Column({ name: 'StockAfter', type: 'decimal', precision: 18, scale: 3 })
  stockAfter!: string;

  @Column({ name: 'UnitCost', type: 'decimal', precision: 18, scale: 2, nullable: true })
  unitCost!: string | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'BatchNumber', type: 'nvarchar', length: 100, nullable: true })
  batchNumber!: string | null;

  @Column({ name: 'ExpiryDate', type: 'date', nullable: true })
  expiryDate!: string | null;

  @Column({ name: 'TransactionAt', type: 'datetime2' })
  transactionAt!: Date;
}
