import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResolvePosProductQueryDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  code!: string;
}
