import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectInvitationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
