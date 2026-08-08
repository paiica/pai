import { IsEmail } from "class-validator";

export class AddExistingStudentDto {
  @IsEmail()
  email: string;
}
