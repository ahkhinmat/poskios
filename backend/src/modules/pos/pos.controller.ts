import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PosService } from './pos.service';
import { ProductImportService } from './product-import.service';
import { SalesOrderService } from './services/sales-order.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreatePosDraftTabDto } from './dto/create-pos-draft-tab.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { PurchaseCheckoutDto } from './dto/purchase-checkout.dto';
import { ResolvePosProductQueryDto } from './dto/resolve-pos-product-query.dto';
import { SearchPosProductsQueryDto } from './dto/search-pos-products-query.dto';
import { UpdatePosDraftTabDto } from './dto/update-pos-draft-tab.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@Roles('STAFF', 'MANAGER')
@Controller('pos')
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly productImportService: ProductImportService,
    private readonly salesOrderService: SalesOrderService,
  ) {}

  // ── Product Management CRUD (before param routes) ──

  @Permissions(PERMISSIONS.PRODUCTS_VIEW)
  @Get('products/manage')
  async manageProducts(
    @Query('keyword') keyword?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe) pageSize?: number,
  ) {
    const data = await this.posService.manageProducts(keyword, page, pageSize);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.PRODUCTS_MANAGE)
  @Post('products')
  async createProduct(@Body() body: CreateProductDto) {
    const data = await this.posService.createProduct(body);

    return {
      success: true,
      message: 'Product created',
      data,
    };
  }

  @Permissions(PERMISSIONS.PRODUCTS_MANAGE)
  @Put('products/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    const data = await this.posService.updateProduct(id, body);

    return {
      success: true,
      message: 'Product updated',
      data,
    };
  }

  @Permissions(PERMISSIONS.PRODUCTS_MANAGE)
  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    const data = await this.posService.deleteProduct(id);

    return {
      success: true,
      message: 'Product deleted',
      data,
    };
  }

  @Get('products/search')
  async searchProducts(@Query() query: SearchPosProductsQueryDto) {
    const data = await this.posService.searchProducts(query);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('products/resolve')
  async resolveProduct(@Query() query: ResolvePosProductQueryDto) {
    const data = await this.posService.resolveProduct(query);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('products/:productId/units')
  async listProductUnits(@Param('productId', ParseIntPipe) productId: number) {
    const data = await this.posService.listProductUnits(productId);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.PRODUCTS_IMPORT)
  @Post('products/import/excel')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async importProductsExcel(@UploadedFile() file?: UploadedExcelFile) {
    const data = await this.posService.importProductsExcel(file);

    return {
      success: true,
      message: 'Import successful',
      data,
    };
  }

  @Permissions(PERMISSIONS.PRODUCTS_IMPORT)
  @Post('products/import/upsert')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async importProductsUpsert(@UploadedFile() file?: UploadedExcelFile) {
    const data = await this.productImportService.importExcel(file);

    return {
      success: true,
      message: 'Import successful',
      data,
    };
  }

  @Get('draft-tabs')
  async listDraftTabs(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.posService.listDraftTabs(user.id);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('draft-tabs')
  async createDraftTab(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePosDraftTabDto,
  ) {
    const data = await this.posService.createDraftTab(
      user.id,
      body,
    );

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Put('draft-tabs/:draftTabId')
  async updateDraftTab(
    @Param('draftTabId', ParseIntPipe) draftTabId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdatePosDraftTabDto,
  ) {
    const data = await this.posService.updateDraftTab(
      draftTabId,
      user.id,
      body,
    );

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Delete('draft-tabs/:draftTabId')
  async closeDraftTab(
    @Param('draftTabId', ParseIntPipe) draftTabId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.posService.closeDraftTab(
      draftTabId,
      user.id,
    );

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('checkout')
  async checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PosCheckoutDto,
  ) {
    const data = await this.posService.checkout(
      user.id,
      body,
    );

    return {
      success: true,
      message: 'Checkout successful',
      data,
    };
  }

  @Permissions(PERMISSIONS.PURCHASE_COMPLETE)
  @Post('purchase-orders/checkout')
  async purchaseCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PurchaseCheckoutDto,
  ) {
    const data = await this.posService.purchaseCheckout(
      user.id,
      body,
    );

    return {
      success: true,
      message: 'Purchase completed',
      data,
    };
  }

  // ── Category CRUD ──

  @Permissions(PERMISSIONS.CATEGORIES_VIEW)
  @Get('categories')
  async searchCategories(@Query('keyword') keyword?: string) {
    const data = await this.posService.searchCategories(keyword);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.UNITS_VIEW)
  @Get('units')
  async listUnits() {
    const data = await this.posService.listUnits();

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.SUPPLIERS_VIEW)
  @Get('suppliers')
  async listSuppliers(@Query('keyword') keyword?: string) {
    const data = await this.posService.listSuppliers(keyword);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('customers/by-phone')
  async getCustomerByPhone(@Query('phone') phone?: string) {
    const data = await this.posService.getCustomerByPhone(phone);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('customers/search')
  async searchCustomers(@Query('keyword') keyword?: string) {
    const data = await this.posService.searchCustomers(keyword);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('customers/upsert-by-phone')
  async upsertCustomerByPhone(
    @Body()
    body: {
      phoneNumber?: string | null;
      fullName?: string | null;
    },
  ) {
    const data = await this.posService.upsertCustomerByPhone(body);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('customers/:id/point-history')
  async getCustomerPointHistory(@Param('id', ParseIntPipe) id: number) {
    const data = await this.posService.getCustomerPointHistory(id);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('loyalty/settings')
  async getLoyaltySettings() {
    const data = await this.posService.getLoyaltySettings();

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.LOYALTY_CONFIGURE)
  @Put('loyalty/settings')
  async updateLoyaltySettings(@Body() body: UpdateLoyaltySettingsDto) {
    const data = await this.posService.updateLoyaltySettings(body);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('settings')
  async getAllSettings() {
    const data = await this.posService.getAllSettings();

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @Put('settings')
  async updateSettings(@Body() body: UpdateSettingsDto) {
    const data = await this.posService.updateSettings(body);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.SUPPLIERS_MANAGE)
  @Post('suppliers')
  async createSupplier(
    @Body()
    body: {
      code?: string | null;
      name: string;
      phoneNumber?: string | null;
      address?: string | null;
    },
  ) {
    const data = await this.posService.createSupplier(body);

    return {
      success: true,
      message: 'Supplier created',
      data,
    };
  }

  @Permissions(PERMISSIONS.SUPPLIERS_MANAGE)
  @Put('suppliers/:id')
  async updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      code?: string | null;
      name?: string;
      phoneNumber?: string | null;
      address?: string | null;
    },
  ) {
    const data = await this.posService.updateSupplier(id, body);

    return {
      success: true,
      message: 'Supplier updated',
      data,
    };
  }

  @Permissions(PERMISSIONS.OVERVIEW_VIEW)
  @Get('overview')
  async getOverview(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const data = await this.posService.getOverviewRecords({ fromDate, toDate });

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.OVERVIEW_VIEW)
  @Get('overview/:recordType/:id')
  async getOverviewDetail(
    @Param('recordType') recordType: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.posService.getOverviewDetail(recordType, id);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Permissions(PERMISSIONS.CATEGORIES_MANAGE)
  @Post('categories')
  async createCategory(@Body() body: { name: string; isActive?: boolean }) {
    const data = await this.posService.createCategory(body);

    return {
      success: true,
      message: 'Category created',
      data,
    };
  }

  @Permissions(PERMISSIONS.CATEGORIES_MANAGE)
  @Put('categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    const data = await this.posService.updateCategory(id, body);

    return {
      success: true,
      message: 'Category updated',
      data,
    };
  }

  @Permissions(PERMISSIONS.CATEGORIES_MANAGE)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    const data = await this.posService.deleteCategory(id);

    return {
      success: true,
      message: 'Category deleted',
      data,
    };
  }

  @Permissions(PERMISSIONS.SALES_CANCEL)
  @Post('sales-orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSalesOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.salesOrderService.cancelSalesOrder(user.id, id);

    return {
      success: true,
      message: 'Sales order cancelled',
    };
  }

}
