import { IsString, IsOptional, IsInt, IsBoolean, Min, MaxLength } from "class-validator";

export class CreateModuleDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
