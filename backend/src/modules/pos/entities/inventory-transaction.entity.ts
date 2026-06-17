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

  @Column({ name: 'TransactionType', type: 'varchar', length: 30 })
  transactionType!: string;

  @Column({ name: 'ReferenceCode', type: 'varchar', length: 50, nullable: true })
  referenceCode!: string | null;

  @Column({ name: 'QuantityChange', type: 'numeric', precision: 18, scale: 3 })
  quantityChange!: string;

  @Column({ name: 'StockBefore', type: 'numeric', precision: 18, scale: 3 })
  stockBefore!: string;

  @Column({ name: 'StockAfter', type: 'numeric', precision: 18, scale: 3 })
  stockAfter!: string;

  @Column({ name: 'UnitCost', type: 'numeric', precision: 18, scale: 2, nullable: true })
  unitCost!: string | null;

  @Column({ name: 'Notes', type: 'varchar', length: 500, nullable: true })
  notes!: string | null;

  @Column({ name: 'BatchNumber', type: 'varchar', length: 100, nullable: true })
  batchNumber!: string | null;

  @Column({ name: 'ExpiryDate', type: 'date', nullable: true })
  expiryDate!: string | null;

  @Column({ name: 'TransactionAt', type: 'timestamp' })
  transactionAt!: Date;
}
