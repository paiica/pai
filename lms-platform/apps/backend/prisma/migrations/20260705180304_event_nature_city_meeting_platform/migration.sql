-- CreateEnum
CREATE TYPE "lms"."EventNature" AS ENUM ('training', 'seminar', 'workshop', 'conference', 'meetup', 'webinar', 'other');

-- CreateEnum
CREATE TYPE "lms"."MeetingPlatform" AS ENUM ('zoom', 'teams', 'google_meet', 'other');

-- AlterTable
ALTER TABLE "lms"."events" ADD COLUMN     "city" TEXT,
ADD COLUMN     "event_nature" "lms"."EventNature",
ADD COLUMN     "meeting_platform" "lms"."MeetingPlatform";
