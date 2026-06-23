import {
  IsString, IsOptional, IsInt, IsBoolean, IsEnum, IsDateString, Min, Max, MaxLength,
} from "class-validator";
import { LessonType } from "@prisma/client";

export class CreateLessonDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(LessonType)
  type: LessonType;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration_minutes?: number;

  @IsOptional()
  @IsBoolean()
  is_free_preview?: boolean;

  // Video
  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsInt()
  video_duration_sec?: number;

  // Reading / download
  @IsOptional()
  @IsString()
  content_body?: string;

  @IsOptional()
  @IsString()
  download_url?: string;

  @IsOptional()
  @IsString()
  external_url?: string;

  // Quiz settings
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

  // Assignment settings
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_score?: number;
}
