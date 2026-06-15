import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  storeAddress?: string | null;

  @IsOptional()
  @IsString()
  storePhoneNumber?: string | null;

  @IsOptional()
  @IsString()
  receiptHeader?: string | null;

  @IsOptional()
  @IsString()
  receiptFooter?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value != null ? Number(value) : null))
  @IsNumber()
  loyaltyEarnAmountPerPoint?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value != null ? Number(value) : null))
  @IsNumber()
  loyaltyRedeemAmountPerPoint?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value != null ? Number(value) : null))
  @IsNumber()
  loyaltyMinimumRedeemPoints?: number | null;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? null : Number(value)))
  @IsNumber()
  loyaltyPointsExpiryDays?: number | null;
}
