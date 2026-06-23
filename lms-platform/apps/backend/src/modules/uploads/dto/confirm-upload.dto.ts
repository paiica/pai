import { IsString, IsInt, IsOptional, Min } from "class-validator";

export class ConfirmUploadDto {
  @IsString()
  s3_key: string;

  @IsString()
  filename: string;

  @IsString()
  original_name: string;

  @IsInt()
  @Min(1)
  size: number;

  @IsString()
  mime_type: string;

  @IsOptional()
  @IsString()
  lesson_id?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
