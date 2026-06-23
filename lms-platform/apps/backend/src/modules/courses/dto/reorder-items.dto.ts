import { IsArray, IsString, ArrayMinSize } from "class-validator";

export class ReorderItemsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ordered_ids: string[];
}
