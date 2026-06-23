import { IsString, IsOptional, IsBoolean, IsUUID } from "class-validator";

export class AssignInstructorDto {
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsBoolean()
  is_lead?: boolean;
}
