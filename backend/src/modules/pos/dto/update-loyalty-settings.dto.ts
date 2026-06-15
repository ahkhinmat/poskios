import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateLoyaltySettingsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  earnAmountPerPoint?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  redeemAmountPerPoint?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 0))
  @IsNumber()
  minimumRedeemPoints?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === undefined || value === '' ? null : Number(value),
  )
  @IsNumber()
  pointsExpiryDays?: number | null;
}
