import { PartialType } from '@nestjs/mapped-types';
import { CreatePosDraftTabDto } from './create-pos-draft-tab.dto';

export class UpdatePosDraftTabDto extends PartialType(CreatePosDraftTabDto) {}
