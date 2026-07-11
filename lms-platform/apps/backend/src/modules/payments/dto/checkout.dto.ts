import { IsString, IsOptional, IsUUID, IsEmail, IsInt, Min, MaxLength } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  @MaxLength(200)
  certification_slug: string;

  @IsOptional()
  @IsUUID()
  application_id?: string;
}

export class CourseCheckoutDto {
  @IsUUID()
  course_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  promo_code?: string;
}

export class CertificationCheckoutDto {
  @IsString()
  @MaxLength(200)
  certification_slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  promo_code?: string;
}

export class EventCheckoutDto {
  @IsUUID()
  event_id: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(60)
  promo_code?: string;
}

export class RenewalCheckoutDto {
  @IsUUID()
  certificate_id: string;
}

export class RefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
