export default () => ({
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  apiPrefix: process.env.API_PREFIX || "api/v1",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (() => { throw new Error("JWT_ACCESS_SECRET environment variable is required"); })(),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (() => { throw new Error("JWT_REFRESH_SECRET environment variable is required"); })(),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || "",
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    bucketName: process.env.S3_BUCKET_NAME || "pai-lms-assets",
  },

  email: {
    apiKey: process.env.RESEND_API_KEY || "",
    from: process.env.EMAIL_FROM || "noreply@paii.ca",
    fromName: process.env.EMAIL_FROM_NAME || "Professional Artificial Intelligence Institute",
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || "60", 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || "100", 10),
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
});
