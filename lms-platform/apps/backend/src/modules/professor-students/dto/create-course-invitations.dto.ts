import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

export class CreateCourseInvitationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  student_ids: string[];
}
