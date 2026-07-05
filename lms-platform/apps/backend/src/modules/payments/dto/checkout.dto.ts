import { IsString, IsOptional, IsUUID, IsEmail, MaxLength } from "class-validator";

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

  @IsOptional()
  @IsString()
  @MaxLength(60)
  promo_code?: string;
}

export class RefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
