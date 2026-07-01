import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { PresignDto } from "./dto/presign.dto";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { v4 as uuidv4 } from "uuid";

const MAX_SIZE_BY_TYPE: Record<string, number> = {
  "video/mp4": 500 * 1024 * 1024,
  "video/webm": 500 * 1024 * 1024,
  "application/pdf": 50 * 1024 * 1024,
  "image/jpeg": 10 * 1024 * 1024,
  "image/png": 10 * 1024 * 1024,
  "image/webp": 10 * 1024 * 1024,
  "application/zip": 100 * 1024 * 1024,
  default: 25 * 1024 * 1024,
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async createPresignedUrl(userId: string, dto: PresignDto) {
    const maxSize = MAX_SIZE_BY_TYPE[dto.mime_type] ?? MAX_SIZE_BY_TYPE.default;
    if (dto.size > maxSize) {
      throw new BadRequestException(
        `File too large. Max size for ${dto.mime_type} is ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }

    const ext = dto.filename.split(".").pop()?.toLowerCase() ?? "bin";
    const s3Key = `uploads/${userId}/${uuidv4()}.${ext}`;
    const bucket = this.config.get<string>("s3.bucketName", "pai-lms-assets");
    const region = this.config.get<string>("s3.region", "us-east-1");

    // Generate presigned URL via AWS SDK if credentials available
    const accessKeyId = this.config.get<string>("s3.accessKeyId");
    const secretAccessKey = this.config.get<string>("s3.secretAccessKey");

    let uploadUrl: string;
    let publicUrl: string;

    if (accessKeyId && secretAccessKey) {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const s3 = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: dto.mime_type,
        ContentLength: dto.size,
      });

      uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    } else {
      // Dev fallback — return a placeholder (upload won't work without real creds)
      this.logger.warn("AWS credentials not configured — returning mock presigned URL");
      uploadUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}?X-Amz-Mock=1`;
      publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    }

    return {
      upload_url: uploadUrl,
      s3_key: s3Key,
      public_url: publicUrl,
      expires_in: 3600,
    };
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    // The presign step scopes every key under uploads/{userId}/... — confirming a key
    // outside your own prefix would let you register another user's file as your own.
    if (!dto.s3_key.startsWith(`uploads/${userId}/`)) {
      throw new BadRequestException("This upload key does not belong to you");
    }

    const bucket = this.config.get<string>("s3.bucketName", "pai-lms-assets");
    const region = this.config.get<string>("s3.region", "us-east-1");
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${dto.s3_key}`;

    return this.prisma.uploadedFile.create({
      data: {
        owner_id: userId,
        lesson_id: dto.lesson_id ?? null,
        filename: dto.filename,
        original_name: dto.original_name,
        size: dto.size,
        mime_type: dto.mime_type,
        s3_key: dto.s3_key,
        url,
        purpose: dto.purpose ?? "content",
      },
    });
  }

  async getMyFiles(userId: string) {
    return this.prisma.uploadedFile.findMany({
      where: { owner_id: userId },
      orderBy: { created_at: "desc" },
      take: 100,
    });
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id: fileId, owner_id: userId },
    });
    if (!file) throw new BadRequestException("File not found");

    const accessKeyId = this.config.get<string>("s3.accessKeyId");
    const secretAccessKey = this.config.get<string>("s3.secretAccessKey");

    if (accessKeyId && secretAccessKey) {
      try {
        const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = new S3Client({
          region: this.config.get<string>("s3.region", "us-east-1"),
          credentials: { accessKeyId, secretAccessKey },
        });
        await s3.send(new DeleteObjectCommand({
          Bucket: this.config.get<string>("s3.bucketName", "pai-lms-assets"),
          Key: file.s3_key,
        }));
      } catch (err) {
        this.logger.error(`Failed to delete S3 object: ${file.s3_key}`, err);
      }
    }

    await this.prisma.uploadedFile.delete({ where: { id: fileId } });
    return { message: "File deleted" };
  }
}
