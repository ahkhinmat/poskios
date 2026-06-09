import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PosDraftItemDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  productId!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  productUnitId!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  @Min(0)
  discountAmount = 0;

  @IsOptional()
  @IsString()
  note?: string | null;
}
