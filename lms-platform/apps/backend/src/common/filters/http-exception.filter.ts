import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) || message;
        errors = res.errors;
      }
    } else if (exception instanceof Error) {
      const requestId = (request as any).requestId;
      this.logger.error(`[${requestId ?? "-"}] Unhandled error: ${exception.message}`, exception.stack);
      this.reportToErrorTracker(exception, request);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  // Reports unexpected (non-HttpException) errors to Sentry if it's installed
  // and SENTRY_DSN is configured — inert otherwise, so this never affects
  // behavior or requires the dependency until someone opts in.
  private async reportToErrorTracker(exception: Error, request: Request) {
    if (!process.env.SENTRY_DSN) return;
    try {
      // Indirected through a variable so TypeScript doesn't require this
      // genuinely-optional package to be installed just to compile.
      const moduleName = "@sentry/node";
      const Sentry = await import(moduleName);
      Sentry.captureException(exception, {
        tags: { requestId: (request as any).requestId },
        extra: { url: request.url, method: request.method },
      });
    } catch {
      this.logger.warn("SENTRY_DSN is set but @sentry/node isn't installed — run `npm install @sentry/node` to enable error reporting.");
    }
  }
}
