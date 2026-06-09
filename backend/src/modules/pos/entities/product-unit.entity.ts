import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Unit } from './unit.entity';

@Entity({ name: 'ProductUnits' })
export class ProductUnit {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'ProductId', type: 'int' })
  productId!: number;

  @Column({ name: 'UnitId', type: 'int' })
  unitId!: number;

  @Column({ name: 'Barcode', type: 'nvarchar', length: 50, nullable: true })
  barcode!: string | null;

  @Column({ name: 'ConversionValue', type: 'decimal', precision: 18, scale: 3 })
  conversionValue!: string;

  @Column({ name: 'CostPrice', type: 'decimal', precision: 18, scale: 2 })
  costPrice!: string;

  @Column({ name: 'SalePrice', type: 'decimal', precision: 18, scale: 2 })
  salePrice!: string;

  @Column({ name: 'AllowDirectSale', type: 'bit' })
  allowDirectSale!: boolean;

  @Column({ name: 'IsDefaultForPos', type: 'bit' })
  isDefaultForPos!: boolean;

  @Column({ name: 'IsSmallestUnit', type: 'bit' })
  isSmallestUnit!: boolean;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;

  @ManyToOne(() => Product, (product) => product.productUnits, { eager: false })
  @JoinColumn({ name: 'ProductId' })
  product!: Product;

  @ManyToOne(() => Unit, { eager: false })
  @JoinColumn({ name: 'UnitId' })
  unit!: Unit;
}
