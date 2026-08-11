import { Module } from "@nestjs/common";
import { TranscriptsService } from "./transcripts.service";
import { TranscriptsController } from "./transcripts.controller";
import { AdminTranscriptsController } from "./admin-transcripts.controller";
import { ProgramsModule } from "../programs/programs.module";

@Module({
  imports: [ProgramsModule],
  providers: [TranscriptsService],
  controllers: [TranscriptsController, AdminTranscriptsController],
})
export class TranscriptsModule {}
