import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { EventsService } from "./events.service";
import { RegisterEventDto } from "./dto/register-event.dto";

@ApiTags("Events — Public")
@Public()
@Controller("events")
export class EventsController {
  constructor(private service: EventsService) {}

  @Get()
  @ApiOperation({ summary: "List published events" })
  findAll() {
    return this.service.findAllPublished();
  }

  @Get(":slug")
  @ApiOperation({ summary: "Get a published event by slug" })
  findOne(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }

  @Post(":id/register")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Register for a free event (guest — no account required)" })
  register(@Param("id") id: string, @Body() dto: RegisterEventDto) {
    return this.service.registerFree(id, dto);
  }
}
