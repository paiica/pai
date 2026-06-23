import {
  Controller, Post, Get, Delete, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, Query, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { extname, join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { UploadsService } from "./uploads.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PresignDto } from "./dto/presign.dto";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";

// Custom in-memory storage that avoids importing multer v2 directly (ESM-only package).
// Implements the multer StorageEngine contract: _handleFile buffers the stream,
// _removeFile is a no-op. The buffer is merged into file.buffer by multer.
const RAM_STORAGE: any = {
  _handleFile(_req: any, file: any, cb: any) {
    const chunks: Buffer[] = [];
    file.stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    file.stream.on("end", () => cb(null, { buffer: Buffer.concat(chunks) }));
    file.stream.on("error", (err: Error) => cb(err));
  },
  _removeFile(_req: any, _file: any, cb: any) { cb(null); },
};

function saveToJustTesting(file: Express.Multer.File): { filename: string; fileUrl: string } {
  const dir = join(process.cwd(), "uploads", "just testing");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
  writeFileSync(join(dir, filename), file.buffer);

  const baseUrl = process.env.API_URL || "http://localhost:4000";
  return { filename, fileUrl: `${baseUrl}/uploads/just%20testing/${filename}` };
}

@ApiTags("Uploads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("uploads")
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post("presign")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get S3 presigned URL for direct browser upload" })
  presign(@CurrentUser("id") userId: string, @Body() dto: PresignDto) {
    return this.uploadsService.createPresignedUrl(userId, dto);
  }

  @Post("confirm")
  @ApiOperation({ summary: "Confirm upload complete and store file metadata" })
  confirm(@CurrentUser("id") userId: string, @Body() dto: ConfirmUploadDto) {
    return this.uploadsService.confirmUpload(userId, dto);
  }

  @Get("my")
  @ApiOperation({ summary: "List my uploaded files" })
  getMyFiles(@CurrentUser("id") userId: string) {
    return this.uploadsService.getMyFiles(userId);
  }

  @Delete(":fileId")
  @ApiOperation({ summary: "Delete an uploaded file" })
  deleteFile(
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.uploadsService.deleteFile(fileId, userId);
  }

  @Post("local")
  @ApiOperation({ summary: "Upload a file to local disk (dev)" })
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadLocal(
    @UploadedFile() file: Express.Multer.File,
    @Query("purpose") purpose = "document",
  ) {
    if (!file) throw new BadRequestException("No file received");
    const { filename, fileUrl } = saveToJustTesting(file);
    return {
      url: fileUrl,
      filename,
      original_name: file.originalname,
      size: file.size,
      mime_type: file.mimetype,
      purpose,
    };
  }

  @Post("document")
  @ApiOperation({ summary: "Upload a document to local disk (dev — swap for S3 later)" })
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file received");
    try {
      const { fileUrl } = saveToJustTesting(file);
      return {
        file_url: fileUrl,
        public_url: fileUrl,
        s3_key: `just-testing/${Date.now()}`,
        file_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
      };
    } catch (e: any) {
      throw new BadRequestException(`Upload save failed: ${e?.message ?? String(e)}`);
    }
  }
}
