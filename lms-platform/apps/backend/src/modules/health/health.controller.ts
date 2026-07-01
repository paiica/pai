import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Health check" })
  async check() {
    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const services = {
      api: "ok",
      database: dbStatus,
      redis: redisStatus,
      // These call out to real APIs on every request, so we only confirm credentials
      // are present rather than making a live third-party call from a health endpoint.
      stripe: this.config.get<string>("stripe.secretKey") ? "configured" : "not_configured",
      s3: this.config.get<string>("s3.accessKeyId") ? "configured" : "not_configured",
      email: this.config.get<string>("email.apiKey") ? "configured" : "not_configured",
    };

    const degraded = dbStatus !== "ok" || redisStatus === "error";
    return {
      status: degraded ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Public()
  @Get("ping")
  @ApiOperation({ summary: "Liveness ping" })
  ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }

  private async checkDatabase(): Promise<"ok" | "error"> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<"ok" | "error" | "not_configured"> {
    if (!this.config.get<string>("redis.host")) return "not_configured";
    const { default: Redis } = await import("ioredis");
    const client = new Redis({
      host: this.config.get<string>("redis.host"),
      port: this.config.get<number>("redis.port"),
      password: this.config.get<string>("redis.password"),
      lazyConnect: true,
      connectTimeout: 1500,
      maxRetriesPerRequest: 0,
    });
    try {
      await client.connect();
      await client.ping();
      return "ok";
    } catch {
      return "error";
    } finally {
      client.disconnect();
    }
  }
}
