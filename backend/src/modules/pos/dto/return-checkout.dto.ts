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
import { ReturnCheckoutItemDto } from './return-checkout-item.dto';

export class ReturnCheckoutDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  sourceSalesOrderId!: number;

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
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  discountAmount = 0;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  returnFeeAmount = 0;

  @IsString()
  @MaxLength(30)
  paymentMethod!: string;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  customerRefundAmount = 0;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnCheckoutItemDto)
  @IsNotEmpty()
  items!: ReturnCheckoutItemDto[];
}
