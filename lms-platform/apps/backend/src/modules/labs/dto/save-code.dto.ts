import { IsInt, IsString, Min } from "class-validator";

export class SaveCodeDto {
  @IsInt()
  @Min(0)
  cell_index: number;

  @IsString()
  code: string;
}
