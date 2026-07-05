import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { EventsService } from "./events.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

@ApiTags("Admin — Events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/events")
export class AdminEventsController {
  constructor(private service: EventsService) {}

  @Get()
  @ApiOperation({ summary: "List all events" })
  findAll() {
    return this.service.adminFindAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one event" })
  findOne(@Param("id") id: string) {
    return this.service.adminFindOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create an event" })
  create(@Body() dto: CreateEventDto) {
    return this.service.adminCreate(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an event" })
  update(@Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.service.adminUpdate(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an event" })
  remove(@Param("id") id: string) {
    return this.service.adminDelete(id);
  }

  @Get(":id/registrations")
  @ApiOperation({ summary: "List registrations for an event" })
  registrations(@Param("id") id: string) {
    return this.service.adminListRegistrations(id);
  }

  @Post(":id/notify")
  @ApiOperation({ summary: "Email all active students an announcement about this event" })
  notify(@Param("id") id: string) {
    return this.service.adminNotifyStudents(id);
  }
}
