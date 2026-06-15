import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ReturnCheckoutDto } from './dto/return-checkout.dto';
import { PosService } from './pos.service';

@Roles('STAFF', 'MANAGER')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly posService: PosService) {}

  @Get('invoices/search')
  async searchInvoices(
    @Query('invoiceCode') invoiceCode: string | undefined,
    @Query('productCode') productCode: string | undefined,
    @Query('fromDate') fromDate: string | undefined,
    @Query('toDate') toDate: string | undefined,
  ) {
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
    @Param('id') id: string,
  ) {
    const data = await this.posService.getReturnInvoiceItems(Number(id));

    return {
      success: true,
      message: 'OK',
      data,
    };
  }

  @Post('checkout')
  async returnCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReturnCheckoutDto,
  ) {
    const data = await this.posService.returnCheckout(
      user.id,
      body,
    );

    return {
      success: true,
      message: 'Return checkout successful',
      data,
    };
  }
}
