import {
  IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsDateString, Min, Max, MaxLength,
} from "class-validator";
import { LessonType } from "@prisma/client";

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @IsOptional()
  @IsBoolean()
  is_free_preview?: boolean;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsInt()
  video_duration_sec?: number;

  @IsOptional()
  @IsString()
  content_body?: string;

  @IsOptional()
  @IsString()
  download_url?: string;

  @IsOptional()
  @IsString()
  external_url?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passing_score?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_attempts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  time_limit_minutes?: number;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_score?: number;
}
