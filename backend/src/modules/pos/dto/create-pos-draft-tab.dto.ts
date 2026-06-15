import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PosDraftItemDto } from './pos-draft-item.dto';

export class CreatePosDraftTabDto {
  @IsString()
  @MaxLength(30)
  tabType!: string;

  @IsString()
  @MaxLength(100)
  title!: string;

  @IsString()
  @MaxLength(30)
  saleMode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? null : Number(value),
  )
  @IsNumber()
  customerId?: number | null;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  redeemedPoints?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  paymentMethod?: string;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  customerPaidAmount = 0;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  discountAmount = 0;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? null : Number(value),
  )
  @IsNumber()
  sourceSalesOrderId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  importDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchaseOrderCode?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? null : Number(value),
  )
  @IsNumber()
  supplierId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierOrderCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierInvoiceCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  purchaseStatus?: string | null;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  supplierPaidAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosDraftItemDto)
  items?: PosDraftItemDto[];
}
