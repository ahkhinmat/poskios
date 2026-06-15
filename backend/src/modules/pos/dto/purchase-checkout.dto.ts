import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PosCheckoutItemDto } from './pos-checkout-item.dto';

export class PurchaseCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchaseOrderCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? null : Number(value)))
  @IsInt()
  @Min(1)
  supplierId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierOrderCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierInvoiceCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsString()
  importDate?: string | null;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  discountAmount = 0;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  supplierPaidAmount = 0;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosCheckoutItemDto)
  @IsNotEmpty()
  items!: PosCheckoutItemDto[];
}
