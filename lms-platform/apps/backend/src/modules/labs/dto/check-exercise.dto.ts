import { IsInt, IsString, MaxLength, Min } from "class-validator";

export class CheckExerciseDto {
  @IsInt()
  @Min(0)
  cell_index: number;

  @IsString()
  @MaxLength(20000)
  code: string;
}
