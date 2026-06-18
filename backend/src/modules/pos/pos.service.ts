import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreatePosDraftTabDto } from './dto/create-pos-draft-tab.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { PurchaseCheckoutDto } from './dto/purchase-checkout.dto';
import { ResolvePosProductQueryDto } from './dto/resolve-pos-product-query.dto';
import { ReturnCheckoutDto } from './dto/return-checkout.dto';
import { SearchPosProductsQueryDto } from './dto/search-pos-products-query.dto';
import { UpdatePosDraftTabDto } from './dto/update-pos-draft-tab.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ProductImportService } from './product-import.service';
import { CategorySupplierService } from './services/category-supplier.service';
import { CustomerLoyaltyService } from './services/customer-loyalty.service';
import { DraftTabService } from './services/draft-tab.service';
import { OverviewService } from './services/overview.service';
import { ProductService } from './services/product.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { SalesOrderService } from './services/sales-order.service';
import { SettingService } from './services/setting.service';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly productService: ProductService,
    private readonly salesOrderService: SalesOrderService,
    private readonly draftTabService: DraftTabService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly customerLoyaltyService: CustomerLoyaltyService,
    private readonly overviewService: OverviewService,
    private readonly categorySupplierService: CategorySupplierService,
    private readonly productImportService: ProductImportService,
    private readonly settingService: SettingService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Return / Invoice Search ──

  async searchReturnInvoice(params: { invoiceCode?: string; productCode?: string; fromDate?: string; toDate?: string }) {
    this.logger.debug(`searchReturnInvoice: ${JSON.stringify(params)}`);
    return this.salesOrderService.searchReturnInvoice(params);
  }

  async getReturnInvoiceItems(invoiceId: number) {
    return this.salesOrderService.getReturnInvoiceItems(invoiceId);
  }

  async returnCheckout(userId: number, payload: ReturnCheckoutDto) {
    const setting = await this.settingService.getOrCreateSetting();
    return this.salesOrderService.returnCheckout(userId, payload, setting);
  }

  // ── Checkout ──

  async checkout(userId: number, payload: PosCheckoutDto) {
    this.logger.log(`User ${userId} checking out: ${payload.items?.length ?? 0} items`);
    const setting = await this.settingService.getOrCreateSetting();
    return this.salesOrderService.checkout(userId, payload, setting);
  }

  // ── Purchase ──

  async purchaseCheckout(userId: number, payload: PurchaseCheckoutDto) {
    this.logger.log(`User ${userId} purchase checkout: ${payload.items?.length ?? 0} items`);
    return this.purchaseOrderService.purchaseCheckout(userId, payload);
  }

  // ── Products ──

  async searchProducts(query: SearchPosProductsQueryDto) {
    return this.productService.searchProducts(query);
  }

  async resolveProduct(query: ResolvePosProductQueryDto) {
    return this.productService.resolveProduct(query);
  }

  async listProductUnits(productId: number) {
    return this.productService.listProductUnits(productId);
  }

  async manageProducts(keyword?: string, page = 1, pageSize = 10) {
    return this.productService.manageProducts(keyword, page, pageSize);
  }

  async createProduct(data: CreateProductDto) {
    return this.productService.createProduct(data);
  }

  async updateProduct(id: number, data: UpdateProductDto) {
    return this.productService.updateProduct(id, data);
  }

  async deleteProduct(id: number) {
    return this.productService.deleteProduct(id);
  }

  // ── Draft Tabs ──

  async listDraftTabs(userId: number) {
    return this.draftTabService.listDraftTabs(userId);
  }

  async createDraftTab(userId: number, payload: CreatePosDraftTabDto) {
    return this.draftTabService.createDraftTab(userId, payload);
  }

  async updateDraftTab(draftTabId: number, userId: number, payload: UpdatePosDraftTabDto) {
    return this.draftTabService.updateDraftTab(draftTabId, userId, payload);
  }

  async closeDraftTab(draftTabId: number, userId: number) {
    return this.draftTabService.closeDraftTab(draftTabId, userId);
  }

  // ── Categories ──

  async searchCategories(keyword?: string) {
    return this.categorySupplierService.searchCategories(keyword);
  }

  async createCategory(data: { name: string; isActive?: boolean }) {
    return this.categorySupplierService.createCategory(data);
  }

  async updateCategory(id: number, data: { name?: string; isActive?: boolean }) {
    return this.categorySupplierService.updateCategory(id, data);
  }

  async deleteCategory(id: number) {
    return this.categorySupplierService.deleteCategory(id);
  }

  // ── Units ──

  async listUnits() {
    return this.categorySupplierService.listUnits();
  }

  // ── Suppliers ──

  async listSuppliers(keyword?: string) {
    return this.categorySupplierService.listSuppliers(keyword);
  }

  async createSupplier(data: { code?: string | null; name: string; phoneNumber?: string | null; address?: string | null }) {
    return this.categorySupplierService.createSupplier(data);
  }

  async updateSupplier(id: number, data: { code?: string | null; name?: string; phoneNumber?: string | null; address?: string | null }) {
    return this.categorySupplierService.updateSupplier(id, data);
  }

  // ── Customer / Loyalty ──

  async getCustomerByPhone(phone?: string) {
    return this.customerLoyaltyService.getCustomerByPhone(phone);
  }

  async searchCustomers(keyword?: string) {
    return this.customerLoyaltyService.searchCustomers(keyword);
  }

  async upsertCustomerByPhone(input: { phoneNumber?: string | null; fullName?: string | null }) {
    return this.customerLoyaltyService.upsertCustomerByPhone(input);
  }

  async getCustomerPointHistory(customerId: number) {
    return this.customerLoyaltyService.getCustomerPointHistory(customerId);
  }

  async getLoyaltySettings() {
    return this.customerLoyaltyService.getLoyaltySettings();
  }

  async updateLoyaltySettings(payload: UpdateLoyaltySettingsDto) {
    return this.customerLoyaltyService.updateLoyaltySettings(payload);
  }

  // ── Settings ──

  async getAllSettings() {
    return this.settingService.getAllSettings();
  }

  async updateSettings(payload: UpdateSettingsDto) {
    return this.settingService.updateSettings(payload);
  }

  // ── Overview ──

  async getOverviewRecords(params: { fromDate?: string; toDate?: string }) {
    return this.overviewService.getOverviewRecords(params);
  }

  async getOverviewDetail(recordType: string, id: number) {
    return this.overviewService.getOverviewDetail(recordType, id);
  }

  async getTopProducts(params: { fromDate?: string; toDate?: string }) {
    return this.overviewService.getTopProducts(params);
  }

  // ── Excel Import ──

  async importProductsExcel(file?: UploadedExcelFile) {
    return this.productImportService.importExcel(file);
  }
}
