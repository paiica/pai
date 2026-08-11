import { IsOptional, IsString, IsInt, Min, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SubmissionFileDto {
  @IsString()
  file_url!: string;

  @IsString()
  file_name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  file_size?: number;
}

export class SubmitAssignmentDto {
  // Kept for backward compatibility — a single-file submission can still
  // pass these flat fields directly. When present, `files` takes
  // precedence for multi-file submissions.
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionFileDto)
  files?: SubmissionFileDto[];

  @IsOptional()
  @IsString()
  text_content?: string;
}
