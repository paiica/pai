import { IsString, IsOptional, IsInt, IsIn, IsArray, MaxLength, Min, Max } from "class-validator";
import { CareerStatus } from "@prisma/client";

export class CreateApplicationDto {
  @IsString()
  @MaxLength(200)
  certification_slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsIn(Object.values(CareerStatus))
  career_status?: CareerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  job_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  years_experience?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  training_hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  linkedin_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  university?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  degree_program?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  graduation_year?: number;

  @IsOptional()
  @IsArray()
  education_entries?: Record<string, any>[];

  @IsOptional()
  @IsArray()
  experience_entries?: Record<string, any>[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  motivation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  how_heard?: string;
}
