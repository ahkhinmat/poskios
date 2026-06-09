import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class SearchPosProductsQueryDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  keyword!: string;

  @Transform(({ value }) => (value === undefined ? 20 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
