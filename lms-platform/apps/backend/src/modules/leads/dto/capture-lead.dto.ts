import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class CaptureLeadDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  page_url?: string;
}
