import { IsOptional, IsString, IsUrl, IsInt, Min } from "class-validator";

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  file_url?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  file_size?: number;

  @IsOptional()
  @IsString()
  text_content?: string;
}
