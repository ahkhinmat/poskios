import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PosCheckoutItemDto } from './pos-checkout-item.dto';

export class PosCheckoutDto {
  @IsString()
  @MaxLength(30)
  saleMode!: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined ? null : Number(value),
  )
  @IsNumber()
  customerId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  discountAmount = 0;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  redeemedPoints?: number;

  @IsString()
  @MaxLength(30)
  paymentMethod!: string;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  customerPaidAmount = 0;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosCheckoutItemDto)
  @IsNotEmpty()
  items!: PosCheckoutItemDto[];
}
