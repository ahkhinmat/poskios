import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Supplier } from '../entities/supplier.entity';
import { Unit } from '../entities/unit.entity';
import { Product } from '../entities/product.entity';

@Injectable()
export class CategorySupplierService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async searchCategories(keyword?: string) {
    if (!keyword || keyword.trim() === '') {
      return this.categoryRepository.find({ order: { name: 'ASC' } });
    }

    return this.categoryRepository
      .createQueryBuilder('c')
      .where('c.Name LIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('c.Name', 'ASC')
      .getMany();
  }

  async createCategory(data: { name: string; isActive?: boolean }) {
    const category = this.categoryRepository.create({ name: data.name, isActive: data.isActive ?? true });
    return this.categoryRepository.save(category);
  }

  async updateCategory(id: number, data: { name?: string; isActive?: boolean }) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');

    if (data.name !== undefined) category.name = data.name;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');

    const productCount = await this.productRepository.countBy({ categoryId: id });
    if (productCount > 0) {
      throw new BadRequestException(`Cannot delete category with ${productCount} product(s) linked`);
    }

    await this.categoryRepository.remove(category);
    return { deleted: true };
  }

  async listUnits() {
    const units = await this.unitRepository.find({ order: { name: 'ASC' } });
    return units.map((unit) => ({ id: unit.id, name: unit.name }));
  }

  async listSuppliers(keyword?: string) {
    const query = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.IsActive = :isActive', { isActive: true });

    if (keyword?.trim()) {
      query.andWhere(new Brackets((qb) => {
        qb.where('supplier.Name LIKE :keyword', { keyword: `%${keyword.trim()}%` })
          .orWhere('supplier.Code LIKE :keyword', { keyword: `%${keyword.trim()}%` });
      }));
    }

    const items = await query.orderBy('supplier.Name', 'ASC').getMany();

    return items.map((item) => ({
      id: item.id, code: item.code, name: item.name, phoneNumber: item.phoneNumber, address: item.address,
    }));
  }

  async createSupplier(data: { code?: string | null; name: string; phoneNumber?: string | null; address?: string | null }) {
    const trimmedName = data.name?.trim();
    if (!trimmedName) throw new BadRequestException('Supplier name is required');

    const supplier = this.supplierRepository.create({
      code: data.code?.trim() || null, name: trimmedName,
      phoneNumber: data.phoneNumber?.trim() || null, address: data.address?.trim() || null,
      notes: null, isActive: true,
    });

    const saved = await this.supplierRepository.save(supplier);

    return { id: saved.id, code: saved.code, name: saved.name, phoneNumber: saved.phoneNumber, address: saved.address };
  }

  async updateSupplier(id: number, data: { code?: string | null; name?: string; phoneNumber?: string | null; address?: string | null }) {
    const supplier = await this.supplierRepository.findOneBy({ id });
    if (!supplier) throw new NotFoundException('Supplier not found');

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) throw new BadRequestException('Supplier name is required');
      supplier.name = trimmedName;
    }

    if (data.code !== undefined) supplier.code = data.code?.trim() || null;
    if (data.phoneNumber !== undefined) supplier.phoneNumber = data.phoneNumber?.trim() || null;
    if (data.address !== undefined) supplier.address = data.address?.trim() || null;

    const saved = await this.supplierRepository.save(supplier);

    return { id: saved.id, code: saved.code, name: saved.name, phoneNumber: saved.phoneNumber, address: saved.address };
  }
}
