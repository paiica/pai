import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ExamSessionsService } from "./exam-sessions.service";
import { ExamSessionsController } from "./exam-sessions.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("jwt.accessSecret"),
      }),
    }),
  ],
  controllers: [ExamSessionsController],
  providers: [ExamSessionsService],
})
export class ExamSessionsModule {}
