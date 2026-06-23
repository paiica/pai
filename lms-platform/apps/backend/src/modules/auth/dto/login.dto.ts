import { IsEmail, IsString, IsOptional, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "sarah.chen@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({ description: "Device info for refresh token tracking" })
  @IsOptional()
  @IsString()
  device_info?: string;
}
