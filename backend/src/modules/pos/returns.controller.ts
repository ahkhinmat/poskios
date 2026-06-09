import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ReturnCheckoutDto } from './dto/return-checkout.dto';
import { PosService } from './pos.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly posService: PosService) {}

  @Get('invoices/search')
  async searchInvoices(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Query('invoiceCode') invoiceCode: string | undefined,
    @Query('productCode') productCode: string | undefined,
    @Query('fromDate') fromDate: string | undefined,
    @Query('toDate') toDate: string | undefined,
  ) {
    this.resolveUserId(userIdHeader);

    const data = await this.posService.searchReturnInvoice({
      invoiceCode,
      productCode,
      fromDate,
      toDate,
    });

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Get('invoices/:id/items')
  async getInvoiceItems(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Param('id') id: string,
  ) {
    this.resolveUserId(userIdHeader);

    const data = await this.posService.getReturnInvoiceItems(Number(id));

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('checkout')
  async returnCheckout(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() body: ReturnCheckoutDto,
  ) {
    const data = await this.posService.returnCheckout(
      this.resolveUserId(userIdHeader),
      body,
    );

    return {
      success: true,
      message: 'Return checkout successful',
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
