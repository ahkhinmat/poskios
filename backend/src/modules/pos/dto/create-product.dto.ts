import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  productCode!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name!: string;

  @IsInt()
  categoryId!: number;

  @IsInt()
  unitId!: number;

  @Min(0)
  costPrice!: number;

  @Min(0)
  salePrice!: number;

  @IsOptional()
  @Min(0)
  stockOnHand?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDirectSale?: boolean;
}
