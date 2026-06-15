import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Category } from './entities/category.entity';
import { ProductUnit } from './entities/product-unit.entity';
import { Product } from './entities/product.entity';
import { Unit } from './entities/unit.entity';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

type ImportProductRow = {
  categoryName: string;
  productCode: string;
  barcode: string | null;
  productName: string;
  salePrice: string;
  costPrice: string;
  stockOnHand: string;
  minStock: string;
  maxStock: string;
  unitName: string;
  conversionValue: string;
  description: string | null;
  noteTemplate: string | null;
  location: string | null;
  weight: string | null;
  trackBatchExpiry: boolean;
  isActive: boolean;
  allowDirectSale: boolean;
};

type ImportResult = {
  fileName: string;
  worksheetName: string;
  totalRows: number;
  createdProducts: number;
  updatedProducts: number;
};

@Injectable()
export class ProductImportService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async importExcel(file?: UploadedExcelFile): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are supported');
    }

    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: false,
    });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = worksheetName
      ? workbook.Sheets[worksheetName]
      : undefined;

    if (!worksheet || !worksheetName) {
      throw new BadRequestException('Workbook does not contain any worksheet');
    }

    const rowsAsArrays = XLSX.utils.sheet_to_json<(string | number | null)[]>(
      worksheet,
      {
        header: 1,
        raw: false,
        defval: '',
      },
    );

    const headers = (rowsAsArrays[0] ?? []).map((value) =>
      String(value ?? '').trim(),
    );
    const headerMap = new Map<string, number>();
    headers.forEach((header, index) => {
      if (header) {
        headerMap.set(header, index);
      }
    });

    const requiredHeaders = [
      'Nhóm hàng(3 Cấp)',
      'Mã hàng',
      'Tên hàng',
      'Giá bán',
      'Giá vốn',
      'Tồn kho',
      'Tồn nhỏ nhất',
      'Tồn lớn nhất',
      'ĐVT',
      'Đang kinh doanh',
      'Được bán trực tiếp',
    ];

    for (const header of requiredHeaders) {
      if (!headerMap.has(header)) {
        throw new BadRequestException(`Missing required column: ${header}`);
      }
    }

    const rows: ImportProductRow[] = [];
    for (let rowIndex = 1; rowIndex < rowsAsArrays.length; rowIndex += 1) {
      const rowData = rowsAsArrays[rowIndex] ?? [];
      const getCellText = (header: string) =>
        this.getSheetArrayCellText(rowData, headerMap, header);

      const productCode = getCellText('Mã hàng');
      const productName = getCellText('Tên hàng');
      const categoryName = getCellText('Nhóm hàng(3 Cấp)');

      if (!productCode || !productName || !categoryName) {
        continue;
      }

      rows.push({
        categoryName,
        productCode,
        barcode: getCellText('Mã vạch') || null,
        productName,
        salePrice: this.toDecimalString(getCellText('Giá bán'), 2),
        costPrice: this.toDecimalString(getCellText('Giá vốn'), 2),
        stockOnHand: this.toDecimalString(getCellText('Tồn kho'), 3),
        minStock: this.toDecimalString(getCellText('Tồn nhỏ nhất'), 3),
        maxStock: this.toDecimalString(getCellText('Tồn lớn nhất'), 3),
        unitName: getCellText('ĐVT') || 'Cái',
        conversionValue: this.toDecimalString(getCellText('Quy đổi') || '1', 3),
        description: this.emptyToNull(getCellText('Mô tả')),
        noteTemplate: this.emptyToNull(getCellText('Mẫu ghi chú')),
        location: this.emptyToNull(getCellText('Vị trí')),
        weight: this.toOptionalDecimalString(getCellText('Trọng lượng'), 3),
        trackBatchExpiry: this.toBooleanFlag(
          getCellText('Quản lý lô-hạn sử dụng'),
        ),
        isActive: this.toBooleanFlag(getCellText('Đang kinh doanh')),
        allowDirectSale: this.toBooleanFlag(
          getCellText('Được bán trực tiếp'),
        ),
      });
    }

    if (!rows.length) {
      throw new BadRequestException('No valid data rows found in worksheet');
    }

    const categoryMap = await this.ensureCategories(rows);
    const unitMap = await this.ensureUnits(rows);
    const productMap = await this.loadExistingProducts(rows);

    let createdProducts = 0;
    let updatedProducts = 0;

    const productsToSave: Product[] = [];

    for (const row of rows) {
      const category = categoryMap.get(this.normalizeLookupKey(row.categoryName));
      const unit = unitMap.get(this.normalizeLookupKey(row.unitName));

      if (!category || !unit) {
        continue;
      }

      let product = productMap.get(row.productCode);

      if (!product) {
        product = this.productRepository.create({
          categoryId: category.id,
          brandId: null,
          unitId: unit.id,
          productCode: row.productCode,
          barcode: row.barcode,
          name: row.productName,
          variantGroupCode: null,
          costPrice: row.costPrice,
          salePrice: row.salePrice,
          stockOnHand: row.stockOnHand,
          minStock: row.minStock,
          maxStock: row.maxStock,
          weight: row.weight,
          description: row.description,
          noteTemplate: row.noteTemplate,
          location: row.location,
          trackBatchExpiry: row.trackBatchExpiry,
          allowDirectSale: row.allowDirectSale,
          isActive: row.isActive,
        });
        createdProducts += 1;
      } else {
        product.categoryId = category.id;
        product.unitId = unit.id;
        product.barcode = row.barcode;
        product.name = row.productName;
        product.costPrice = row.costPrice;
        product.salePrice = row.salePrice;
        product.stockOnHand = row.stockOnHand;
        product.minStock = row.minStock;
        product.maxStock = row.maxStock;
        product.weight = row.weight;
        product.description = row.description;
        product.noteTemplate = row.noteTemplate;
        product.location = row.location;
        product.trackBatchExpiry = row.trackBatchExpiry;
        product.allowDirectSale = row.allowDirectSale;
        product.isActive = row.isActive;
        updatedProducts += 1;
      }

      productsToSave.push(product);
    }

    // Save all products in batches for performance
    for (const batch of this.chunkArray(productsToSave, 100)) {
      await this.productRepository.save(batch);
    }

    // Upsert ProductUnit for each product
    const productUnitKeys = new Set<string>();
    const productUnitsToSave: ProductUnit[] = [];

    for (const row of rows) {
      const unit = unitMap.get(this.normalizeLookupKey(row.unitName));
      if (!unit) continue;
      const product = productsToSave.find(
        (p) => p.productCode === row.productCode,
      );
      if (!product || !product.id) continue;

      const key = `${product.id}:${unit.id}`;
      if (productUnitKeys.has(key)) continue;
      productUnitKeys.add(key);

      const existingProductUnit = await this.productUnitRepository.findOneBy({
        productId: product.id,
        unitId: unit.id,
      });

      if (existingProductUnit) {
        existingProductUnit.barcode = row.barcode;
        existingProductUnit.conversionValue = row.conversionValue;
        existingProductUnit.costPrice = row.costPrice;
        existingProductUnit.salePrice = row.salePrice;
        existingProductUnit.allowDirectSale = row.allowDirectSale;
        existingProductUnit.isDefaultForPos =
          this.toNumber(row.conversionValue) <= 1;
        existingProductUnit.isSmallestUnit =
          this.toNumber(row.conversionValue) <= 1;
        existingProductUnit.isActive = row.isActive;
        productUnitsToSave.push(existingProductUnit);
      } else {
        productUnitsToSave.push(
          this.productUnitRepository.create({
            productId: product.id,
            unitId: unit.id,
            barcode: row.barcode,
            conversionValue: row.conversionValue,
            costPrice: row.costPrice,
            salePrice: row.salePrice,
            allowDirectSale: row.allowDirectSale,
            isDefaultForPos: this.toNumber(row.conversionValue) <= 1,
            isSmallestUnit: this.toNumber(row.conversionValue) <= 1,
            isActive: row.isActive,
          }),
        );
      }
    }

    for (const batch of this.chunkArray(productUnitsToSave, 100)) {
      await this.productUnitRepository.save(batch);
    }

    return {
      fileName: file.originalname,
      worksheetName,
      totalRows: rows.length,
      createdProducts,
      updatedProducts,
    };
  }

  private async ensureCategories(rows: ImportProductRow[]) {
    const names = [...new Set(rows.map((row) => row.categoryName))];
    const existing = await this.categoryRepository.find();
    const map = new Map(
      existing.map((item) => [this.normalizeLookupKey(item.name), item]),
    );

    for (const name of names) {
      const lookupKey = this.normalizeLookupKey(name);
      if (!map.has(lookupKey)) {
        const saved = await this.categoryRepository.save(
          this.categoryRepository.create({ name, isActive: true }),
        );
        map.set(lookupKey, saved);
      }
    }

    return map;
  }

  private async ensureUnits(rows: ImportProductRow[]) {
    const names = [...new Set(rows.map((row) => row.unitName))];
    const existing = await this.unitRepository.find();
    const map = new Map(
      existing.map((item) => [this.normalizeLookupKey(item.name), item]),
    );

    for (const name of names) {
      const lookupKey = this.normalizeLookupKey(name);
      if (!map.has(lookupKey)) {
        const saved = await this.unitRepository.save(
          this.unitRepository.create({ name }),
        );
        map.set(lookupKey, saved);
      }
    }

    return map;
  }

  private async loadExistingProducts(rows: ImportProductRow[]) {
    const productCodes = [...new Set(rows.map((row) => row.productCode))];
    const map = new Map<string, Product>();

    for (const chunk of this.chunkArray(productCodes, 500)) {
      const items = await this.productRepository
        .createQueryBuilder('product')
        .where('product.productCode IN (:...codes)', { codes: chunk })
        .getMany();

      for (const item of items) {
        map.set(item.productCode, item);
      }
    }

    return map;
  }

  private getSheetArrayCellText(
    rowData: (string | number | null)[],
    headerMap: Map<string, number>,
    header: string,
  ) {
    const index = headerMap.get(header);
    if (index === undefined) return '';
    const value = rowData[index];
    return value === null || value === undefined ? '' : String(value).trim();
  }

  private toDecimalString(value: string, scale: number) {
    const normalized = this.toNumber(value);
    return normalized.toFixed(scale);
  }

  private toOptionalDecimalString(value: string, scale: number) {
    if (!value) return null;
    return this.toNumber(value).toFixed(scale);
  }

  private toNumber(value: string) {
    const normalized = Number(String(value).replace(/,/g, '').trim() || 0);
    if (Number.isNaN(normalized)) return 0;
    return normalized;
  }

  private toBooleanFlag(value: string) {
    return ['1', 'true', 'TRUE', 'yes', 'YES'].includes(String(value).trim());
  }

  private emptyToNull(value: string) {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeLookupKey(value: string) {
    return value.trim().toLocaleLowerCase('vi-VN');
  }

  private chunkArray<T>(items: T[], size: number) {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }
}
