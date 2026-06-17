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

  @Column({ name: 'Barcode', type: 'varchar', length: 50, nullable: true })
  barcode!: string | null;

  @Column({ name: 'ConversionValue', type: 'numeric', precision: 18, scale: 3 })
  conversionValue!: string;

  @Column({ name: 'CostPrice', type: 'numeric', precision: 18, scale: 2 })
  costPrice!: string;

  @Column({ name: 'SalePrice', type: 'numeric', precision: 18, scale: 2 })
  salePrice!: string;

  @Column({ name: 'AllowDirectSale', type: 'boolean' })
  allowDirectSale!: boolean;

  @Column({ name: 'IsDefaultForPos', type: 'boolean' })
  isDefaultForPos!: boolean;

  @Column({ name: 'IsSmallestUnit', type: 'boolean' })
  isSmallestUnit!: boolean;

  @Column({ name: 'IsActive', type: 'boolean' })
  isActive!: boolean;

  @ManyToOne(() => Product, (product) => product.productUnits, { eager: false })
  @JoinColumn({ name: 'ProductId' })
  product!: Product;

  @ManyToOne(() => Unit, { eager: false })
  @JoinColumn({ name: 'UnitId' })
  unit!: Unit;
}
