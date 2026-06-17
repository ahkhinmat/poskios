import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { ResolvePosProductQueryDto } from '../dto/resolve-pos-product-query.dto';
import { SearchPosProductsQueryDto } from '../dto/search-pos-products-query.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductUnit } from '../entities/product-unit.entity';
import { Product } from '../entities/product.entity';
import { Unit } from '../entities/unit.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductUnit)
    private readonly productUnitRepository: Repository<ProductUnit>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async searchProducts(query: SearchPosProductsQueryDto) {
    const keyword = query.keyword.trim();
    const items = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.allowDirectSale = :allowDirectSale', { allowDirectSale: true })
      .andWhere('productUnit.isActive = :productUnitIsActive', { productUnitIsActive: true })
      .andWhere('productUnit.allowDirectSale = :productUnitAllowDirectSale', { productUnitAllowDirectSale: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('productUnit.barcode = :keyword', { keyword })
            .orWhere('product.barcode = :keyword', { keyword })
            .orWhere('product.productCode = :keyword', { keyword })
            .orWhere('product.name LIKE :nameKeyword', { nameKeyword: `%${keyword}%` });
        }),
      )
      .orderBy(
        `CASE
          WHEN productUnit.barcode = :keyword THEN 1
          WHEN product.barcode = :keyword THEN 2
          WHEN product.productCode = :keyword THEN 3
          ELSE 4
        END`,
      )
      .addOrderBy('product.name', 'ASC')
      .setParameter('keyword', keyword)
      .limit(query.limit * 5)
      .getMany();

    const grouped = this.pickDefaultUnitsForGroups(items);

    return {
      items: grouped.slice(0, query.limit).map((item) => this.toPosProductResponse(item)),
    };
  }

  async resolveProduct(query: ResolvePosProductQueryDto) {
    const code = query.code.trim();
    const productUnit = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.allowDirectSale = :allowDirectSale', { allowDirectSale: true })
      .andWhere('productUnit.isActive = :productUnitIsActive', { productUnitIsActive: true })
      .andWhere('productUnit.allowDirectSale = :productUnitAllowDirectSale', { productUnitAllowDirectSale: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('productUnit.barcode = :code', { code })
            .orWhere('product.barcode = :code', { code })
            .orWhere('product.productCode = :code', { code });
        }),
      )
      .orderBy(
        `CASE
          WHEN productUnit.barcode = :code THEN 1
          WHEN product.barcode = :code THEN 2
          WHEN product.productCode = :code THEN 3
          ELSE 4
        END`,
      )
      .setParameter('code', code)
      .getOne();

    if (!productUnit) {
      throw new NotFoundException('Product not found');
    }

    return this.toPosProductResponse(await this.getDefaultProductUnitForGroup(productUnit));
  }

  async listProductUnits(productId: number) {
    const selectedProductUnit = await this.productUnitRepository.findOne({
      where: { productId, isActive: true, allowDirectSale: true },
      relations: { product: true, unit: true },
      order: { isDefaultForPos: 'DESC', isSmallestUnit: 'DESC', id: 'ASC' },
    });

    if (!selectedProductUnit?.product) {
      throw new NotFoundException('Product units not found');
    }

    const groupCode =
      selectedProductUnit.product.variantGroupCode ?? selectedProductUnit.product.productCode;

    const productUnits = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('productUnit.isActive = :isActive', { isActive: true })
      .andWhere('productUnit.allowDirectSale = :allowDirectSale', { allowDirectSale: true })
      .andWhere('product.isActive = :productIsActive', { productIsActive: true })
      .andWhere('product.allowDirectSale = :productAllowDirectSale', { productAllowDirectSale: true })
      .andWhere(
        '(product.variantGroupCode = :groupCode OR (product.variantGroupCode IS NULL AND product.productCode = :groupCode))',
        { groupCode },
      )
      .orderBy('productUnit.isDefaultForPos', 'DESC')
      .addOrderBy('productUnit.isSmallestUnit', 'DESC')
      .addOrderBy('productUnit.conversionValue', 'ASC')
      .addOrderBy('product.id', 'ASC')
      .getMany();

    return {
      items: productUnits.map((item) => this.toPosProductUnitResponse(item)),
    };
  }

  async manageProducts(keyword?: string, page = 1, pageSize = 10) {
    let whereSql = '';
    const sqlParams: any[] = [];
    if (keyword?.trim()) {
      whereSql = 'WHERE (p."ProductCode" LIKE $1 OR p."Name" LIKE $1 OR p."Barcode" LIKE $1)';
      sqlParams.push(`%${keyword.trim()}%`);
    }

    const offset = (page - 1) * pageSize;

    const countRows = await this.dataSource.query(
      `SELECT COUNT(1) AS cnt FROM "Products" p ${whereSql}`,
      sqlParams,
    );
    const total = Number(countRows[0]?.cnt ?? 0);
    if (!total) return { items: [], total: 0 };

    const idRows = await this.dataSource.query(
      `SELECT p."Id" FROM "Products" p ${whereSql} ORDER BY p."Name" ASC LIMIT ${pageSize} OFFSET ${offset}`,
      sqlParams,
    );

    const ids = idRows.map((r: any) => Number(r.Id)).filter((n) => n > 0);

    const products = await this.productRepository.find({
      where: { id: In(ids) },
      order: { name: 'ASC' },
    });

    const allUnits = ids.length
      ? await this.productUnitRepository.find({
          where: { productId: In(ids) },
          relations: { unit: true },
          order: { isDefaultForPos: 'DESC', id: 'ASC' },
        })
      : [];

    const unitsByProductId = new Map<number, ProductUnit[]>();
    for (const pu of allUnits) {
      const list = unitsByProductId.get(pu.productId);
      if (list) list.push(pu);
      else unitsByProductId.set(pu.productId, [pu]);
    }

    return {
      items: products.map((product) => {
        const units = unitsByProductId.get(product.id) ?? [];
        const defaultUnit = units.find((pu) => pu.isDefaultForPos) ?? units[0];
        return {
          id: product.id,
          productCode: product.productCode,
          barcode: product.barcode,
          name: product.name,
          categoryId: product.categoryId,
          costPrice: Number(product.costPrice),
          salePrice: Number(product.salePrice),
          stockOnHand: Number(product.stockOnHand),
          isActive: product.isActive,
          allowDirectSale: product.allowDirectSale,
          units: units.map((pu) => ({
            id: pu.id,
            unitId: pu.unitId,
            unitName: pu.unit?.name ?? '',
            barcode: pu.barcode,
            conversionValue: Number(pu.conversionValue),
            costPrice: Number(pu.costPrice),
            salePrice: Number(pu.salePrice),
            isDefaultForPos: pu.isDefaultForPos,
            isActive: pu.isActive,
          })),
          defaultUnitName: defaultUnit?.unit?.name ?? '',
        };
      }),
      total,
    };
  }

  async createProduct(data: CreateProductDto) {
    const product = this.productRepository.create({
      categoryId: data.categoryId,
      brandId: null,
      unitId: data.unitId,
      productCode: data.productCode,
      barcode: data.barcode ?? null,
      name: data.name,
      costPrice: data.costPrice.toFixed(2),
      salePrice: data.salePrice.toFixed(2),
      stockOnHand: (data.stockOnHand ?? 0).toFixed(3),
      minStock: '0',
      maxStock: '0',
      weight: null,
      description: null,
      noteTemplate: null,
      location: null,
      trackBatchExpiry: false,
      allowDirectSale: data.allowDirectSale ?? true,
      isActive: data.isActive ?? true,
    });

    const saved = await this.productRepository.save(product);

    const productUnit = this.productUnitRepository.create({
      productId: saved.id,
      unitId: data.unitId,
      barcode: data.barcode ?? null,
      conversionValue: '1',
      costPrice: data.costPrice.toFixed(2),
      salePrice: data.salePrice.toFixed(2),
      allowDirectSale: data.allowDirectSale ?? true,
      isDefaultForPos: true,
      isSmallestUnit: true,
      isActive: data.isActive ?? true,
    });

    await this.productUnitRepository.save(productUnit);

    const result = await this.manageProducts(saved.productCode);
    return result.items[0] ?? null;
  }

  async updateProduct(id: number, data: UpdateProductDto) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');

    if (data.name !== undefined) product.name = data.name;
    if (data.barcode !== undefined) product.barcode = data.barcode;
    if (data.categoryId !== undefined) product.categoryId = data.categoryId;
    if (data.costPrice !== undefined) product.costPrice = data.costPrice.toFixed(2);
    if (data.salePrice !== undefined) product.salePrice = data.salePrice.toFixed(2);
    if (data.stockOnHand !== undefined) product.stockOnHand = data.stockOnHand.toFixed(3);
    if (data.isActive !== undefined) product.isActive = data.isActive;
    if (data.allowDirectSale !== undefined) product.allowDirectSale = data.allowDirectSale;

    if (data.unitId !== undefined && data.unitId !== product.unitId) {
      product.unitId = data.unitId;
      const existingDefault = await this.productUnitRepository.findOneBy({
        productId: id,
        isDefaultForPos: true,
      });
      if (existingDefault) {
        existingDefault.unitId = data.unitId;
        await this.productUnitRepository.save(existingDefault);
      } else {
        await this.productUnitRepository.save(
          this.productUnitRepository.create({
            productId: id,
            unitId: data.unitId,
            barcode: product.barcode,
            conversionValue: '1',
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            allowDirectSale: product.allowDirectSale,
            isDefaultForPos: true,
            isSmallestUnit: true,
            isActive: product.isActive,
          }),
        );
      }
    }

    await this.productRepository.save(product);

    const result = await this.manageProducts(product.productCode);
    return result.items[0] ?? null;
  }

  async deleteProduct(id: number) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');

    product.isActive = false;
    await this.productRepository.save(product);

    return { deleted: true };
  }

  async findProductUnitsByIds(ids: number[]) {
    return this.productUnitRepository.find({
      where: { id: In(ids), isActive: true },
      relations: { product: true, unit: true },
    });
  }

  async findProductUnitMap(ids: number[]) {
    const items = await this.findProductUnitsByIds(ids);
    return new Map(items.map((item) => [item.id, item]));
  }

  getVariantGroupCode(productUnit: ProductUnit) {
    return productUnit.product.variantGroupCode ?? productUnit.product.productCode;
  }

  pickDefaultUnitsForGroups(productUnits: ProductUnit[]) {
    const grouped = new Map<string, ProductUnit>();

    for (const item of productUnits) {
      const groupCode = this.getVariantGroupCode(item);
      const current = grouped.get(groupCode);

      if (!current || this.compareProductUnitsForDefault(item, current) < 0) {
        grouped.set(groupCode, item);
      }
    }

    return [...grouped.values()];
  }

  compareProductUnitsForDefault(left: ProductUnit, right: ProductUnit) {
    const leftDefaultScore = left.isDefaultForPos ? 0 : 1;
    const rightDefaultScore = right.isDefaultForPos ? 0 : 1;
    if (leftDefaultScore !== rightDefaultScore) return leftDefaultScore - rightDefaultScore;

    const leftSmallestScore = left.isSmallestUnit ? 0 : 1;
    const rightSmallestScore = right.isSmallestUnit ? 0 : 1;
    if (leftSmallestScore !== rightSmallestScore) return leftSmallestScore - rightSmallestScore;

    const conversionDiff = Number(left.conversionValue) - Number(right.conversionValue);
    if (conversionDiff !== 0) return conversionDiff;

    return left.id - right.id;
  }

  async getDefaultProductUnitForGroup(productUnit: ProductUnit) {
    const groupCode = this.getVariantGroupCode(productUnit);
    const siblingUnits = await this.productUnitRepository
      .createQueryBuilder('productUnit')
      .innerJoinAndSelect('productUnit.product', 'product')
      .innerJoinAndSelect('productUnit.unit', 'unit')
      .where('productUnit.isActive = :isActive', { isActive: true })
      .andWhere('productUnit.allowDirectSale = :allowDirectSale', { allowDirectSale: true })
      .andWhere('product.isActive = :productIsActive', { productIsActive: true })
      .andWhere('product.allowDirectSale = :productAllowDirectSale', { productAllowDirectSale: true })
      .andWhere(
        '(product.variantGroupCode = :groupCode OR (product.variantGroupCode IS NULL AND product.productCode = :groupCode))',
        { groupCode },
      )
      .getMany();

    return this.pickDefaultUnitsForGroups(siblingUnits)[0] ?? productUnit;
  }

  toPosProductResponse(productUnit: ProductUnit) {
    return {
      id: productUnit.product.id,
      productUnitId: productUnit.id,
      productCode: productUnit.product.productCode,
      barcode: productUnit.barcode ?? productUnit.product.barcode,
      name: productUnit.product.name,
      unitId: productUnit.unit.id,
      unitName: productUnit.unit.name,
      conversionValue: Number(productUnit.conversionValue),
      costPrice: Number(productUnit.costPrice),
      salePrice: Number(productUnit.salePrice),
      stockOnHand: Number(productUnit.product.stockOnHand),
      allowDirectSale: productUnit.product.allowDirectSale && productUnit.allowDirectSale,
      isActive: productUnit.product.isActive && productUnit.isActive,
    };
  }

  toPosProductUnitResponse(productUnit: ProductUnit) {
    return {
      productUnitId: productUnit.id,
      productId: productUnit.product.id,
      productCode: productUnit.product.productCode,
      productName: productUnit.product.name,
      unitId: productUnit.unit.id,
      unitName: productUnit.unit.name,
      barcode: productUnit.barcode ?? productUnit.product.barcode,
      conversionValue: Number(productUnit.conversionValue),
      costPrice: Number(productUnit.costPrice),
      salePrice: Number(productUnit.salePrice),
      stockOnHand: Number(productUnit.product.stockOnHand),
      allowDirectSale: productUnit.product.allowDirectSale && productUnit.allowDirectSale,
      isDefaultForPos: productUnit.isDefaultForPos,
      isSmallestUnit: productUnit.isSmallestUnit,
      isActive: productUnit.product.isActive && productUnit.isActive,
    };
  }
}
