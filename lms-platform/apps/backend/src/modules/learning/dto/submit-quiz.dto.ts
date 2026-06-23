import { IsObject, IsNotEmpty } from "class-validator";

export class SubmitQuizDto {
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, number | string>;
}
