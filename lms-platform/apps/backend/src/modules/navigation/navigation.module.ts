import { Module } from "@nestjs/common";
import { NavigationController } from "./navigation.controller";
import { NavigationService } from "./navigation.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
