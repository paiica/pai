import { IsString, IsInt, IsOptional, IsIn, Min, Max } from "class-validator";

const ALLOWED_TYPES = [
  "video/mp4", "video/webm",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/zip",
];

export class PresignDto {
  @IsString()
  filename: string;

  @IsString()
  @IsIn(ALLOWED_TYPES)
  mime_type: string;

  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024) // 500MB max
  size: number;

  @IsOptional()
  @IsString()
  lesson_id?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
