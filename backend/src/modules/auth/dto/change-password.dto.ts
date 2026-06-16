import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  oldPassword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  newPassword!: string;
}
