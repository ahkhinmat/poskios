import {
  Body,
  BadRequestException,
  Controller,
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
import { CreatePosDraftTabDto } from './dto/create-pos-draft-tab.dto';
import { PosCheckoutDto } from './dto/pos-checkout.dto';
import { ResolvePosProductQueryDto } from './dto/resolve-pos-product-query.dto';
import { SearchPosProductsQueryDto } from './dto/search-pos-products-query.dto';
import { UpdatePosDraftTabDto } from './dto/update-pos-draft-tab.dto';

type UploadedExcelFile = {
  originalname: string;
  buffer: Buffer;
};

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

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

  private resolveUserId(userIdHeader?: string) {
    const parsed = Number(userIdHeader);

    if (!(Number.isInteger(parsed) && parsed > 0)) {
      throw new BadRequestException('x-user-id header is required');
    }

    return parsed;
  }
}
