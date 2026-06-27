import { Module } from "@nestjs/common";
import { AssignmentsService } from "./assignments.service";
import { AssignmentsController } from "./assignments.controller";
import { AdminAssignmentsController } from "./admin-assignments.controller";

@Module({
  providers: [AssignmentsService],
  controllers: [AssignmentsController, AdminAssignmentsController],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
