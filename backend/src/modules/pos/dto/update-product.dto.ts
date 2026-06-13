export class UpdateProductDto {
  barcode?: string;
  name?: string;
  categoryId?: number;
  unitId?: number;
  costPrice?: number;
  salePrice?: number;
  stockOnHand?: number;
  isActive?: boolean;
  allowDirectSale?: boolean;
}
