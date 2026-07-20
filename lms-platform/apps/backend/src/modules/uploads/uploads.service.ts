import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { PresignDto } from "./dto/presign.dto";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { v4 as uuidv4 } from "uuid";

type S3Config = {
  bucket: string;
  region: string;
  endpoint: string;       // "" = real AWS
  publicUrlBase: string;  // "" = derive from endpoint/bucket/region
  accessKeyId: string;
  secretAccessKey: string;
};

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
    private siteSettings: SiteSettingsService,
  ) {}

  // S3-compatible services (Cloudflare R2, Backblaze B2, MinIO, ...) work
  // with the same @aws-sdk/client-s3 calls used for real AWS — they just need
  // a custom `endpoint` (and usually path-style addressing). Admin-configured
  // values in site_settings (Settings → APIs → Storage) take priority over
  // env vars, mirroring how AI provider settings are resolved in ai.service.ts,
  // so switching providers doesn't require a redeploy.
  private async getS3Config(): Promise<S3Config> {
    const db = await this.siteSettings.getAll();
    return {
      bucket: db.s3_bucket_name || this.config.get<string>("s3.bucketName", "pai-lms-assets")!,
      region: db.s3_region || this.config.get<string>("s3.region", "us-east-1")!,
      endpoint: db.s3_endpoint || this.config.get<string>("s3.endpoint", "")!,
      publicUrlBase: db.s3_public_url_base || this.config.get<string>("s3.publicUrlBase", "")!,
      accessKeyId: db.s3_access_key_id || this.config.get<string>("s3.accessKeyId", "")!,
      secretAccessKey: db.s3_secret_access_key || this.config.get<string>("s3.secretAccessKey", "")!,
    };
  }

  private async getS3Client(cfg: S3Config) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    return new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      // Real AWS resolves buckets as subdomains; most S3-compatible services
      // (R2, B2, MinIO) require the bucket in the path instead.
      ...(cfg.endpoint ? { endpoint: cfg.endpoint, forcePathStyle: true } : {}),
    });
  }

  // The upload endpoint isn't necessarily the public read URL (e.g. Cloudflare
  // R2's S3 API endpoint is private — public access needs its own r2.dev or
  // custom domain, set via `publicUrlBase`). Falls back to path-style off the
  // endpoint (works for B2/MinIO public buckets), then real AWS's
  // virtual-hosted-style URL when no endpoint is configured at all.
  private buildPublicUrl(cfg: S3Config, key: string): string {
    if (cfg.publicUrlBase) return `${cfg.publicUrlBase.replace(/\/$/, "")}/${key}`;
    if (cfg.endpoint) return `${cfg.endpoint.replace(/\/$/, "")}/${cfg.bucket}/${key}`;
    return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
  }

  async createPresignedUrl(userId: string, dto: PresignDto) {
    const maxSize = MAX_SIZE_BY_TYPE[dto.mime_type] ?? MAX_SIZE_BY_TYPE.default;
    if (dto.size > maxSize) {
      throw new BadRequestException(
        `File too large. Max size for ${dto.mime_type} is ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }

    const ext = dto.filename.split(".").pop()?.toLowerCase() ?? "bin";
    const s3Key = `uploads/${userId}/${uuidv4()}.${ext}`;
    const cfg = await this.getS3Config();

    let uploadUrl: string;

    if (cfg.accessKeyId && cfg.secretAccessKey) {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const s3 = await this.getS3Client(cfg);
      const command = new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: s3Key,
        ContentType: dto.mime_type,
        ContentLength: dto.size,
      });

      uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    } else {
      // Dev fallback — return a placeholder (upload won't work without real creds)
      this.logger.warn("Storage credentials not configured — returning mock presigned URL");
      uploadUrl = `${this.buildPublicUrl(cfg, s3Key)}?X-Amz-Mock=1`;
    }

    return {
      upload_url: uploadUrl,
      s3_key: s3Key,
      public_url: this.buildPublicUrl(cfg, s3Key),
      expires_in: 3600,
    };
  }

  // Server-side counterpart to the presigned-upload flow above — used when the
  // backend already holds the file bytes in memory (e.g. images pulled out of
  // an imported course package) rather than the browser uploading directly.
  async uploadBufferServerSide(buffer: Buffer, keySuffix: string, contentType: string): Promise<string> {
    const s3Key = `imports/${uuidv4()}-${keySuffix}`;
    const cfg = await this.getS3Config();

    if (!cfg.accessKeyId || !cfg.secretAccessKey) {
      this.logger.warn("Storage credentials not configured — skipping server-side upload");
      return this.buildPublicUrl(cfg, s3Key);
    }

    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client(cfg);
    await s3.send(new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    }));

    return this.buildPublicUrl(cfg, s3Key);
  }

  // Like uploadBufferServerSide, but without the random UUID prefix — needed
  // when re-hosting a bundle of files that reference each other by hardcoded
  // relative path (e.g. an Articulate Rise export's index.html loading
  // "lib/dist/xxx.js"), where every file must land at an exact, predictable
  // key for those references to keep resolving correctly.
  async uploadBufferAtExactKey(buffer: Buffer, exactKey: string, contentType: string): Promise<string> {
    const cfg = await this.getS3Config();

    if (!cfg.accessKeyId || !cfg.secretAccessKey) {
      this.logger.warn("Storage credentials not configured — skipping server-side upload");
      return this.buildPublicUrl(cfg, exactKey);
    }

    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client(cfg);
    await s3.send(new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: exactKey,
      Body: buffer,
      ContentType: contentType,
    }));

    return this.buildPublicUrl(cfg, exactKey);
  }

  // Deletes a specific set of objects (e.g. the images an imported lesson's
  // content_body referenced). S3's batch-delete API caps at 1000 keys per
  // call, hence the chunking — comfortably more than any single lesson or
  // hosted Rise site will ever reference, but defensive regardless.
  async deleteObjectsByKeys(keys: string[]): Promise<void> {
    if (!keys.length) return;
    const cfg = await this.getS3Config();
    if (!cfg.accessKeyId || !cfg.secretAccessKey) return;

    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client(cfg);
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      await s3.send(new DeleteObjectsCommand({
        Bucket: cfg.bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      }));
    }
  }

  // Deletes every object under a key prefix — used for a "Preserve Original
  // Design" lesson's whole hosted site (rise-sites/{id}/...), which can be
  // dozens of files, not just one.
  async deleteObjectsByPrefix(prefix: string): Promise<number> {
    const cfg = await this.getS3Config();
    if (!cfg.accessKeyId || !cfg.secretAccessKey) return 0;

    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const s3 = await this.getS3Client(cfg);
    let deleted = 0;
    let continuationToken: string | undefined;
    do {
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      const keys = (list.Contents ?? []).map((o) => o.Key).filter((k): k is string => !!k);
      if (keys.length) {
        await this.deleteObjectsByKeys(keys);
        deleted += keys.length;
      }
      continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuationToken);
    return deleted;
  }

  // Cleans up whatever R2 objects a lesson's content referenced, before its
  // row is deleted — otherwise the file just stays orphaned in the bucket
  // forever. Best-effort: pattern-matches our own known key prefixes
  // ("imports/" for decompose-mode images, "rise-sites/{id}/" for a
  // preserve-mode lesson's whole hosted site, "scorm-sites/{id}/" for a
  // SCORM lesson's whole hosted package) rather than fully parsing the
  // URL, since the public URL format varies by provider (custom domain,
  // path-style, virtual-hosted-style all look different). Safe to call on
  // any lesson, including hand-authored ones with nothing to clean up.
  async cleanupLessonStorage(lesson: { content_body?: string | null; external_url?: string | null }): Promise<void> {
    try {
      if (lesson.content_body) {
        const keys = [...lesson.content_body.matchAll(/imports\/[^\s"')]+/g)].map((m) => m[0]);
        if (keys.length) await this.deleteObjectsByKeys(keys);
      }
      if (lesson.external_url) {
        const prefixMatch = lesson.external_url.match(/(?:rise-sites|scorm-sites)\/[^/]+\//);
        if (prefixMatch) await this.deleteObjectsByPrefix(prefixMatch[0]);
      }
    } catch (err) {
      // Never let storage cleanup failure block the actual delete the user asked for.
      this.logger.error("Failed to clean up R2 objects for a deleted lesson", err);
    }
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    // The presign step scopes every key under uploads/{userId}/... — confirming a key
    // outside your own prefix would let you register another user's file as your own.
    if (!dto.s3_key.startsWith(`uploads/${userId}/`)) {
      throw new BadRequestException("This upload key does not belong to you");
    }

    const cfg = await this.getS3Config();
    const url = this.buildPublicUrl(cfg, dto.s3_key);

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

    const cfg = await this.getS3Config();
    if (cfg.accessKeyId && cfg.secretAccessKey) {
      try {
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = await this.getS3Client(cfg);
        await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: file.s3_key }));
      } catch (err) {
        this.logger.error(`Failed to delete S3 object: ${file.s3_key}`, err);
      }
    }

    await this.prisma.uploadedFile.delete({ where: { id: fileId } });
    return { message: "File deleted" };
  }
}
