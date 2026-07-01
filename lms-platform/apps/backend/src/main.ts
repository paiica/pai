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

// Optional — only activates if SENTRY_DSN is set AND @sentry/node is installed
// (`npm install @sentry/node`). Safe to leave unset; this is a no-op otherwise.
async function initErrorTracking() {
  if (!process.env.SENTRY_DSN) return;
  try {
    // Indirected through a variable so TypeScript doesn't require this
    // genuinely-optional package to be installed just to compile.
    const moduleName = "@sentry/node";
    const Sentry = await import(moduleName);
    Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
    console.log("[PAII Backend] Sentry error tracking enabled");
  } catch {
    console.warn("SENTRY_DSN is set but @sentry/node isn't installed — run `npm install @sentry/node` to enable error reporting.");
  }
}

async function bootstrap() {
  await initErrorTracking();

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
    hsts: nodeEnv === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    contentSecurityPolicy: nodeEnv === "production"
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", ...allowedOrigins],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
          },
        }
      : false,
  }));

  // CORS — always restrict to explicit allowed origins (never use `true`)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (server-to-server, curl) and allowed origins
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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
      .setTitle("PAII LMS API")
      .setDescription("Professional Artificial Intelligence Institute — LMS Platform API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`[PAII Backend] running on http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== "production") {
    console.log(`[PAII Backend] Swagger at http://localhost:${port}/${apiPrefix}/docs`);
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
            profile: { create: { first_name: "PAII", last_name: "Admin", display_name: "PAII Administrator" } },
          },
        });
        console.log(`[PAII Bootstrap] Super admin created: ${adminEmail}`);
      }
    } catch (e) {
      console.error("[PAII Bootstrap] Failed to create super admin:", e);
    }
  } else {
    console.warn("[PAII Bootstrap] SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping auto-create.");
  }
}

bootstrap();
