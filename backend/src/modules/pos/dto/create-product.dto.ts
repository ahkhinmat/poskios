export class CreateProductDto {
  productCode!: string;
  barcode?: string;
  name!: string;
  categoryId!: number;
  unitId!: number;
  costPrice!: number;
  salePrice!: number;
  stockOnHand?: number;
  isActive?: boolean;
  allowDirectSale?: boolean;
}
