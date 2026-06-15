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
  @IsString()
  currencySuffix?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  receiptPaperWidth?: string;

  @IsOptional()
  @IsString()
  receiptPoweredBy?: string;

  @IsOptional()
  @IsString()
  defaultPaymentMethod?: string;

  @IsOptional()
  @IsNumber()
  quickPayAmount1?: number;

  @IsOptional()
  @IsNumber()
  quickPayAmount2?: number;

  @IsOptional()
  @IsNumber()
  quickPayAmount3?: number;

  @IsOptional()
  @IsString()
  salesOrderPrefix?: string;

  @IsOptional()
  @IsString()
  returnOrderPrefix?: string;

  @IsOptional()
  @IsString()
  purchaseOrderPrefix?: string;

  @IsOptional()
  @IsNumber()
  productSearchMaxResults?: number;

  @IsOptional()
  @IsNumber()
  invoiceSearchMaxResults?: number;

  @IsOptional()
  @IsNumber()
  customerSearchMaxResults?: number;

  @IsOptional()
  @IsNumber()
  defaultAddQuantity?: number;

  @IsOptional()
  @IsString()
  overviewPassword?: string;

  @IsOptional()
  @IsString()
  cashierLabel?: string;

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
