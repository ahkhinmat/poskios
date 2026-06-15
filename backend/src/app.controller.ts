import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return {
      success: true,
      message: 'POS backend is running',
      data: {
        service: 'backend',
      },
    };
  }
}
