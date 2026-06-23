import { IsOptional, IsInt, IsBoolean, Min, Max } from "class-validator";

export class CompleteLessonDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  watch_seconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  last_position?: number;
}
