import {
  Body,
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Headers,
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
import { CreatePosDraftTabDto } from './dto/create-pos-draft-tab.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { PurchaseCheckoutDto } from './dto/purchase-checkout.dto';
import { ResolvePosProductQueryDto } from './dto/resolve-pos-product-query.dto';
import { SearchPosProductsQueryDto } from './dto/search-pos-products-query.dto';
import { UpdatePosDraftTabDto } from './dto/update-pos-draft-tab.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateLoyaltySettingsDto } from './dto/update-loyalty-settings.dto';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@Controller('pos')
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly productImportService: ProductImportService,
  ) {}

  // ── Product Management CRUD (before param routes) ──

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

  @Post('products')
  async createProduct(@Body() body: CreateProductDto) {
    const data = await this.posService.createProduct(body);

    return {
      success: true,
      message: 'Product created',
      data,
    };
  }

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
  async listDraftTabs(@Headers('x-user-id') userIdHeader?: string) {
    const data = await this.posService.listDraftTabs(
      this.resolveUserId(userIdHeader),
    );

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('draft-tabs')
  async createDraftTab(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() body: CreatePosDraftTabDto,
  ) {
    const data = await this.posService.createDraftTab(
      this.resolveUserId(userIdHeader),
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
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() body: UpdatePosDraftTabDto,
  ) {
    const data = await this.posService.updateDraftTab(
      draftTabId,
      this.resolveUserId(userIdHeader),
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
    @Headers('x-user-id') userIdHeader: string | undefined,
  ) {
    const data = await this.posService.closeDraftTab(
      draftTabId,
      this.resolveUserId(userIdHeader),
    );

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('checkout')
  async checkout(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() body: PosCheckoutDto,
  ) {
    const data = await this.posService.checkout(
      this.resolveUserId(userIdHeader),
      body,
    );

    return {
      success: true,
      message: 'Checkout successful',
      data,
    };
  }

  @Post('purchase-orders/checkout')
  async purchaseCheckout(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() body: PurchaseCheckoutDto,
  ) {
    const data = await this.posService.purchaseCheckout(
      this.resolveUserId(userIdHeader),
      body,
    );

    return {
      success: true,
      message: 'Purchase completed',
      data,
    };
  }

  // ── Category CRUD ──

  @Get('categories')
  async searchCategories(@Query('keyword') keyword?: string) {
    const data = await this.posService.searchCategories(keyword);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('units')
  async listUnits() {
    const data = await this.posService.listUnits();

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

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

  @Put('loyalty/settings')
  async updateLoyaltySettings(@Body() body: UpdateLoyaltySettingsDto) {
    const data = await this.posService.updateLoyaltySettings(body);

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

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

  @Post('categories')
  async createCategory(@Body() body: { name: string; isActive?: boolean }) {
    const data = await this.posService.createCategory(body);

    return {
      success: true,
      message: 'Category created',
      data,
    };
  }

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

  private resolveUserId(userIdHeader?: string) {
    const parsed = Number(userIdHeader);

    if (!(Number.isInteger(parsed) && parsed > 0)) {
      throw new BadRequestException('x-user-id header is required');
    }

    return parsed;
  }
}
