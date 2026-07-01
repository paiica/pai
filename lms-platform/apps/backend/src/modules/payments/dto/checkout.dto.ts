import { IsString, IsOptional, IsUUID, MaxLength } from "class-validator";

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

export class RefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
