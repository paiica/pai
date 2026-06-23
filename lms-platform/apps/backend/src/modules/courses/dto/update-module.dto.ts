import { IsString, IsOptional, IsInt, IsBoolean, Min, MaxLength } from "class-validator";

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
