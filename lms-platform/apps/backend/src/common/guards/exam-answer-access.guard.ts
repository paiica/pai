import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";

// Distinct from RolesGuard: passing RolesGuard only proves the caller has
// the generic admin/super_admin role, which in this platform is also handed
// out for unrelated admin tasks (content, marketing, support). Endpoints
// that return or accept exam correct-answer data (correct_index, is_correct)
// require this additional, narrower check so holding the generic admin role
// alone doesn't imply access to every certification's answer key. Apply
// after RolesGuard, e.g. @UseGuards(RolesGuard, ExamAnswerAccessGuard).
@Injectable()
export class ExamAnswerAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException("Access denied");

    if (user.role === "super_admin" || user.can_view_exam_answers === true) {
      return true;
    }
    throw new ForbiddenException("You don't have permission to view or edit exam answer keys. Ask a super admin to grant exam answer access.");
  }
}
