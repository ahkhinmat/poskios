import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductUnit } from './product-unit.entity';

@Entity({ name: 'Products' })
export class Product {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id!: number;

  @Column({ name: 'CategoryId', type: 'int' })
  categoryId!: number;

  @Column({ name: 'BrandId', type: 'int', nullable: true })
  brandId!: number | null;

  @Column({ name: 'UnitId', type: 'int' })
  unitId!: number;

  @Column({ name: 'ProductCode', type: 'nvarchar', length: 50 })
  productCode!: string;

  @Column({ name: 'Barcode', type: 'nvarchar', length: 50, nullable: true })
  barcode!: string | null;

  @Column({ name: 'Name', type: 'nvarchar', length: 255 })
  name!: string;

  @Column({
    name: 'VariantGroupCode',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  variantGroupCode!: string | null;

  @Column({ name: 'CostPrice', type: 'decimal', precision: 18, scale: 2 })
  costPrice!: string;

  @Column({ name: 'SalePrice', type: 'decimal', precision: 18, scale: 2 })
  salePrice!: string;

  @Column({ name: 'StockOnHand', type: 'decimal', precision: 18, scale: 3 })
  stockOnHand!: string;

  @Column({ name: 'MinStock', type: 'decimal', precision: 18, scale: 3 })
  minStock!: string;

  @Column({ name: 'MaxStock', type: 'decimal', precision: 18, scale: 3 })
  maxStock!: string;

  @Column({ name: 'Weight', type: 'decimal', precision: 18, scale: 3, nullable: true })
  weight!: string | null;

  @Column({ name: 'Description', type: 'nvarchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ name: 'NoteTemplate', type: 'nvarchar', length: 500, nullable: true })
  noteTemplate!: string | null;

  @Column({ name: 'Location', type: 'nvarchar', length: 150, nullable: true })
  location!: string | null;

  @Column({ name: 'TrackBatchExpiry', type: 'bit' })
  trackBatchExpiry!: boolean;

  @Column({ name: 'AllowDirectSale', type: 'bit' })
  allowDirectSale!: boolean;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive!: boolean;

  @Column({ name: 'ImportedCreatedAt', type: 'datetime2', nullable: true })
  importedCreatedAt!: Date | null;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime2' })
  updatedAt!: Date;

  @OneToMany(() => ProductUnit, (productUnit) => productUnit.product)
  productUnits!: ProductUnit[];
}
