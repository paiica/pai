import { IsString, IsOptional, IsEmail, IsInt, Min, MaxLength } from "class-validator";

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

  @IsString()
  @MaxLength(200)
  address_line1: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  state_province: string;

  @IsString()
  @MaxLength(20)
  postal_code: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsString()
  @MaxLength(150)
  profession: string;

  @IsString()
  @MaxLength(150)
  job_title: string;

  @IsString()
  @MaxLength(200)
  education: string;

  @IsInt()
  @Min(0)
  years_experience: number;
}
