import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalNumberTransformer } from './decimal.transformer';

@Entity({ name: 'Customers' })
export class Customer {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'PhoneNumber', type: 'nvarchar', length: 30 })
  phoneNumber!: string;

  @Column({ name: 'FullName', type: 'nvarchar', length: 150, nullable: true })
  fullName!: string | null;

  @Column({
    name: 'CurrentPoints',
    type: 'decimal',
    precision: 18,
    scale: 4,
    transformer: decimalNumberTransformer,
  })
  currentPoints!: number;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;
}
