import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "crypto";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const now = Date.now();

    // A per-request id ties this log line to whatever the exception filter
    // logs for the same request if it fails, and to the id returned to the
    // client via X-Request-Id — the thing you'd actually search logs by
    // when a user reports "it broke."
    const requestId: string = req.headers["x-request-id"] || randomUUID();
    req.requestId = requestId;

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        res.setHeader("X-Request-Id", requestId);
        this.logger.log(`[${requestId}] ${method} ${url} ${res.statusCode} +${Date.now() - now}ms`);
      })
    );
  }
}
