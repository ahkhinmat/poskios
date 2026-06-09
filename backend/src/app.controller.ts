import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
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
