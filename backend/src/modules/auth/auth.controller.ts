import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const data = await this.authService.login(body);

    return {
      success: true,
      message: 'Login successful',
      data,
    };
  }

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'OK',
      data: user,
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, body);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
