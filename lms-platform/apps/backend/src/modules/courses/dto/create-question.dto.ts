import { IsString, IsOptional, IsInt, IsEnum, IsArray, Min, ArrayMinSize } from "class-validator";
import { QuestionType } from "@prisma/client";

export class CreateQuestionDto {
  @IsString()
  question_text: string;

  @IsEnum(QuestionType)
  question_type: QuestionType;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsInt()
  correct_index: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
