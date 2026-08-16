import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsEnum, IsDateString, IsArray, IsIn, Min, Max, MaxLength,
} from "class-validator";
import { LessonType, SublessonKind, SublessonOpenBehavior } from "@prisma/client";

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

  @IsOptional()
  @IsDateString()
  available_from?: string;

  @IsOptional()
  @IsBoolean()
  accept_submissions?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_text_response?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  text_word_limit?: number;

  @IsOptional()
  @IsBoolean()
  allow_late_submissions?: boolean;

  @IsOptional()
  @IsDateString()
  late_submission_deadline?: string;

  @IsOptional()
  @IsIn(["percentage", "points"])
  late_penalty_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  late_penalty_value?: number;

  @IsOptional()
  @IsBoolean()
  allow_file_upload?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_files?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepted_file_types?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  max_file_size_mb?: number;

  @IsOptional()
  rubric_json?: { criterion: string; description?: string; points: number }[];

  @IsOptional()
  lab_cells_json?: { type: "markdown" | "code"; content: string; runnable?: boolean; skip_reason?: string }[];

  // Sublesson settings — only meaningful on a lesson row that has
  // parent_lesson_id set (see schema.prisma's Lesson model comment). Sent
  // through the same generic lesson-update endpoint since a Sublesson is
  // edited with the same ReadingEditor as any other lesson.
  @IsOptional()
  @IsEnum(SublessonKind)
  sublesson_kind?: SublessonKind;

  @IsOptional()
  @IsBoolean()
  visible_in_structure?: boolean;

  @IsOptional()
  @IsBoolean()
  available_via_link?: boolean;

  @IsOptional()
  @IsBoolean()
  sublesson_required?: boolean;

  @IsOptional()
  @IsBoolean()
  track_views?: boolean;

  @IsOptional()
  @IsEnum(SublessonOpenBehavior)
  open_behavior?: SublessonOpenBehavior;
}
