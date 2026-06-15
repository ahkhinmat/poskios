import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalNumberTransformer } from './decimal.transformer';

@Entity({ name: 'LoyaltyPointTransactions' })
export class LoyaltyPointTransaction {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'CustomerId', type: 'int' })
  customerId!: number;

  @Column({ name: 'SalesOrderId', type: 'int', nullable: true })
  salesOrderId!: number | null;

  @Column({ name: 'TransactionType', type: 'nvarchar', length: 30 })
  transactionType!: string;

  @Column({
    name: 'PointsChange',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalNumberTransformer,
  })
  pointsChange!: number;

  @Column({
    name: 'BalanceAfter',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalNumberTransformer,
  })
  balanceAfter!: number;

  @Column({
    name: 'AmountBasis',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  amountBasis!: string | null;

  @Column({ name: 'ExpireAt', type: 'datetime2', nullable: true })
  expireAt!: Date | null;

  @Column({ name: 'Notes', type: 'nvarchar', length: 255, nullable: true })
  notes!: string | null;

  @Column({ name: 'TransactionAt', type: 'datetime2' })
  transactionAt!: Date;
}
