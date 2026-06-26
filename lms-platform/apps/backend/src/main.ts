import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ExpressAdapter, NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { join } from "path";
import * as bcrypt from "bcryptjs";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PrismaService } from "./modules/prisma/prisma.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    logger: ["error", "warn", "log", "debug"],
  });

  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

  app.use(json({ limit: "10mb" }));
  app.use(urlencoded({ extended: true, limit: "10mb" }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const apiPrefix = configService.get<string>("API_PREFIX", "api/v1");
  const nodeEnv = configService.get<string>("NODE_ENV", "development");
  const frontendUrl = configService.get<string>("FRONTEND_URL", "http://localhost:3001");
  const corsOrigins = configService.get<string>("CORS_ORIGINS", frontendUrl);
  const allowedOrigins = corsOrigins.split(",").map((u) => u.trim()).filter(Boolean);

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // CORS
  app.enableCors({
    origin: nodeEnv === "production" ? allowedOrigins : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Refresh-Token"],
    exposedHeaders: ["X-Access-Token"],
  });

  // API versioning
  app.setGlobalPrefix(apiPrefix);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger (non-production)
  if (nodeEnv !== "production") {
    const config = new DocumentBuilder()
      .setTitle("PAI LMS API")
      .setDescription("Professional AI Institute — LMS Platform API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`[PAI Backend] running on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== "production") {
    console.log(`[PAI Backend] Swagger at http://localhost:${port}/${apiPrefix}/docs`);
  }

  // Auto-create super admin if env vars are provided and no admin exists yet
  const adminEmail    = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    try {
      const prisma = app.get(PrismaService);
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email:          adminEmail,
            password_hash:  await bcrypt.hash(adminPassword, 12),
            role:           "super_admin",
            email_verified: true,
            profile: { create: { first_name: "PAI", last_name: "Admin", display_name: "PAI Administrator" } },
          },
        });
        console.log(`[PAI Bootstrap] Super admin created: ${adminEmail}`);
      }
    } catch (e) {
      console.error("[PAI Bootstrap] Failed to create super admin:", e);
    }
  } else {
    console.warn("[PAI Bootstrap] SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping auto-create.");
  }
}

bootstrap();
