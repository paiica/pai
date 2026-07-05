/*
  Warnings:

  - You are about to drop the column `address` on the `event_registrations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "lms"."event_registrations" DROP COLUMN "address",
ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "state_province" TEXT;
