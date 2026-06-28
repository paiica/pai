import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsDateString,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "sarah.chen@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePass123!", minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  })
  password: string;

  @ApiProperty({ example: "Sarah" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  first_name: string;

  @ApiProperty({ example: "Chen" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  last_name: string;

  @ApiPropertyOptional({ example: "+1 416 555 0100" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: "Canada" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: "1990-06-15" })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ example: "student", enum: ["student", "sales_rep"] })
  @IsOptional()
  @IsString()
  @IsIn(["student", "sales_rep"])
  role?: string;

  @ApiPropertyOptional({ example: "A1B2C3D4" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referral_code?: string;
}
