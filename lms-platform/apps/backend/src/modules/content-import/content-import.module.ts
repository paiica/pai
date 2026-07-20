import { Module } from "@nestjs/common";
import { ContentImportService } from "./content-import.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [UploadsModule],
  providers: [ContentImportService],
  exports: [ContentImportService],
})
export class ContentImportModule {}
