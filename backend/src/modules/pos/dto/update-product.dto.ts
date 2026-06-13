import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsInt()
  unitId?: number;

  @IsOptional()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Min(0)
  salePrice?: number;

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
