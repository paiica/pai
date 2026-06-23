import { IsNumber, IsOptional, IsString, Min, Max } from "class-validator";

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  grade: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
