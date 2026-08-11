import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class ExecuteCellDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  code: string;
}
