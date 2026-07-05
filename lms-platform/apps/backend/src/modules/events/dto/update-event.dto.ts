import {
  IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsInt,
  IsBoolean, IsArray, Min, MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { EventType, EventStatus, EventNature, MeetingPlatform } from "@prisma/client";

export class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(200) slug?: string;
  @IsOptional() @IsDateString() start_at?: string;
  @IsOptional() @IsDateString() end_at?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() cover_image_url?: string;
  @IsOptional() @IsString() promo_video_url?: string;
  @IsOptional() @IsEnum(EventNature) event_nature?: EventNature;
  @IsOptional() @IsEnum(EventType) event_type?: EventType;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() location_address?: string;
  @IsOptional() @IsString() meeting_link?: string;
  @IsOptional() @IsEnum(MeetingPlatform) meeting_platform?: MeetingPlatform;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @IsArray() @Type(() => Object) speakers?: any[];
  @IsOptional() @IsArray() @Type(() => Object) agenda?: any[];
  @IsOptional() @IsArray() topics?: string[];
  @IsOptional() @IsBoolean() is_featured?: boolean;
}
