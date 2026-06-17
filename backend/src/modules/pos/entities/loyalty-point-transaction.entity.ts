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

  @Column({ name: 'TransactionType', type: 'varchar', length: 30 })
  transactionType!: string;

  @Column({
    name: 'PointsChange',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: decimalNumberTransformer,
  })
  pointsChange!: number;

  @Column({
    name: 'BalanceAfter',
    type: 'numeric',
    precision: 18,
    scale: 4,
    transformer: decimalNumberTransformer,
  })
  balanceAfter!: number;

  @Column({
    name: 'AmountBasis',
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  amountBasis!: string | null;

  @Column({ name: 'ExpireAt', type: 'timestamp', nullable: true })
  expireAt!: Date | null;

  @Column({ name: 'Notes', type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @Column({ name: 'TransactionAt', type: 'timestamp' })
  transactionAt!: Date;
}
