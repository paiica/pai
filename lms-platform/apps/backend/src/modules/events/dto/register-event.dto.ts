import { IsString, IsOptional, IsEmail, MaxLength } from "class-validator";

export class RegisterEventDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
