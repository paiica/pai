import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "./common/decorators/public.decorator";

@ApiTags("Root")
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: "API root — version and status" })
  root() {
    return {
      name: "Professional AI Institute — LMS API",
      version: "1.0",
      status: "ok",
      docs: "/api/v1/docs",
      health: "/api/v1/health",
    };
  }

  @Public()
  @Get("time")
  @ApiOperation({ summary: "Server UTC time for client clock sync" })
  time() {
    return { utc: new Date().toISOString(), ts: Date.now() };
  }
}
