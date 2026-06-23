import { IsOptional, IsInt, Min } from "class-validator";

export class UpdateProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  watch_seconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  last_position?: number;
}
