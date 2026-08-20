import { Module } from "@nestjs/common";
import { CareerProfilesController } from "./career-profiles.controller";
import { CareerProfilesService } from "./career-profiles.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [CareerProfilesController],
  providers: [CareerProfilesService],
})
export class CareerProfilesModule {}
