import { IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({ example: "sarah.chen@example.com" })
  @IsEmail()
  email: string;
}
