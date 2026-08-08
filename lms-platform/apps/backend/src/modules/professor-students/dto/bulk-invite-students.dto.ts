import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from "class-validator";

export class BulkInviteStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsEmail({}, { each: true })
  emails: string[];
}
