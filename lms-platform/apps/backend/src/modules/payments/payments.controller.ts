import {
  Controller, Get, Post, Body, Req, UseGuards,
  RawBodyRequest, Headers, HttpCode, HttpStatus,
  Param, Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { Role, InstitutionRole } from "@prisma/client";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { InstitutionRoleGuard } from "../../common/guards/institution-role.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { InstitutionRoles } from "../../common/decorators/institution-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";
import { CreateCheckoutDto, CourseCheckoutDto, CertificationCheckoutDto, ProgramCheckoutDto, EventCheckoutDto, RenewalCheckoutDto, RetakeCheckoutDto, ReactivationCheckoutDto, RefundDto } from "./dto/checkout.dto";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("checkout")
  @ApiOperation({ summary: "Checkout for certification (via application flow)" })
  createCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckoutSession(userId, dto.certification_slug, dto.application_id, dto.currency);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("course-checkout")
  @ApiOperation({ summary: "Buy a prep course (direct enrollment after payment)" })
  courseCheckout(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
    @Body() dto: CourseCheckoutDto,
  ) {
    return this.paymentsService.createCourseCheckoutSession(userId, dto.course_id, dto.promo_code, undefined, role, dto.currency);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("certification-checkout")
  @ApiOperation({ summary: "Enroll in a certification directly (no application form)" })
  certificationCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: CertificationCheckoutDto,
  ) {
    return this.paymentsService.createCertificationCheckoutSession(userId, dto.certification_slug, dto.promo_code, dto.currency);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("program-checkout")
  @ApiOperation({ summary: "Buy a program (grants access to all its bundled courses)" })
  programCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: ProgramCheckoutDto,
  ) {
    return this.paymentsService.createProgramCheckoutSession(userId, dto.program_id, dto.promo_code, dto.currency);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("renewal-checkout")
  @ApiOperation({ summary: "Pay to renew a certificate (PDU requirement must already be met)" })
  renewalCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: RenewalCheckoutDto,
  ) {
    return this.paymentsService.createRenewalCheckoutSession(userId, dto.certificate_id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("retake-checkout")
  @ApiOperation({ summary: "Pay to unlock the next exam retake for an enrollment" })
  retakeCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: RetakeCheckoutDto,
  ) {
    return this.paymentsService.createRetakeCheckoutSession(userId, dto.enrollment_id, dto.currency);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reactivation-checkout")
  @ApiOperation({ summary: "Pay to reactivate a suspended enrollment (e.g. after an org removed you)" })
  reactivationCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: ReactivationCheckoutDto,
  ) {
    return this.paymentsService.createReactivationCheckoutSession(userId, dto.enrollment_id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my")
  @ApiOperation({ summary: "Get my payment history" })
  getMyPayments(@CurrentUser("id") userId: string) {
    return this.paymentsService.getMyPayments(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my-orders")
  @ApiOperation({ summary: "Get all orders including free enrollments" })
  getMyOrders(@CurrentUser("id") userId: string) {
    return this.paymentsService.getMyOrders(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("orders/:id")
  @ApiOperation({ summary: "Get full billing detail for one order (for receipt/invoice PDFs)" })
  getOrderDetail(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.paymentsService.getOrderDetail(userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("billing-portal")
  @ApiOperation({ summary: "Create Stripe billing portal session for card management" })
  billingPortal(@CurrentUser("id") userId: string) {
    return this.paymentsService.createBillingPortalSession(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("lab-sandbox-checkout")
  @ApiOperation({ summary: "Subscribe to the Labs Playground's cloud sandbox ($200/month, auto-renews)" })
  labSandboxCheckout(@CurrentUser("id") userId: string) {
    return this.paymentsService.createLabSandboxCheckoutSession(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("lab-sandbox-subscription/cancel")
  @ApiOperation({ summary: "Stop auto-renewal of the Cloud Sandbox subscription (access continues until period end)" })
  cancelLabSandboxSubscription(@CurrentUser("id") userId: string) {
    return this.paymentsService.cancelLabSandboxSubscription(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("lab-sandbox-subscription/resume")
  @ApiOperation({ summary: "Undo a scheduled cancellation before the current period ends" })
  resumeLabSandboxSubscription(@CurrentUser("id") userId: string) {
    return this.paymentsService.resumeLabSandboxSubscription(userId);
  }

  // ── Institution subscription billing (academia app) ────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Post("institutions/:institutionId/subscribe")
  @ApiOperation({ summary: "Institution admin: subscribe to a package ($/month, auto-renews)" })
  subscribeInstitution(
    @Param("institutionId") institutionId: string,
    @CurrentUser("email") userEmail: string,
    @Body() dto: { package_id: string },
  ) {
    return this.paymentsService.createInstitutionSubscriptionCheckoutSession(institutionId, dto.package_id, userEmail);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Post("institutions/:institutionId/subscription/cancel")
  @ApiOperation({ summary: "Institution admin: stop auto-renewal (access continues until period end)" })
  cancelInstitutionSubscription(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string) {
    return this.paymentsService.cancelInstitutionSubscription(institutionId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Post("institutions/:institutionId/subscription/resume")
  @ApiOperation({ summary: "Institution admin: undo a scheduled cancellation" })
  resumeInstitutionSubscription(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string) {
    return this.paymentsService.resumeInstitutionSubscription(institutionId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Get("institutions/:institutionId/subscription/preview")
  @ApiOperation({ summary: "Institution admin: preview the prorated charge/credit for switching plans (read-only, no charge)" })
  previewInstitutionSubscriptionChange(
    @Param("institutionId") institutionId: string,
    @Query("package_id") packageId: string,
  ) {
    return this.paymentsService.previewInstitutionSubscriptionChange(institutionId, packageId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Post("institutions/:institutionId/subscription/change")
  @ApiOperation({ summary: "Institution admin: switch to a different package (prorated immediately, no new checkout needed)" })
  changeInstitutionSubscription(
    @CurrentUser("id") userId: string,
    @Param("institutionId") institutionId: string,
    @Body() dto: { package_id: string },
  ) {
    return this.paymentsService.changeInstitutionSubscription(institutionId, dto.package_id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @Post("institutions/:institutionId/billing-portal")
  @ApiOperation({ summary: "Institution admin: Stripe billing portal session (update card, view Stripe invoices)" })
  createInstitutionBillingPortal(@Param("institutionId") institutionId: string) {
    return this.paymentsService.createInstitutionBillingPortalSession(institutionId);
  }

  @Public()
  @Post("event-checkout")
  @ApiOperation({ summary: "Register + pay for a paid event (guest — no account required)" })
  eventCheckout(@Body() dto: EventCheckoutDto) {
    return this.paymentsService.createEventCheckoutSession(dto);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get("admin/list")
  @ApiOperation({ summary: "List all payments (admin)" })
  adminList(@Query() query: { page?: string; limit?: string; status?: string; type?: string; search?: string }) {
    return this.paymentsService.adminList(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get("admin/stats")
  @ApiOperation({ summary: "Payment revenue stats (admin)" })
  adminStats() {
    return this.paymentsService.adminStats();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get("admin/:id/order-detail")
  @ApiOperation({ summary: "Get full billing detail for any payment (admin) — for the Invoice/Receipt links on the Transactions table" })
  adminGetOrderDetail(@Param("id") id: string) {
    return this.paymentsService.adminGetOrderDetail(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Post("admin/:id/refund")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Issue full refund for a payment (admin)" })
  adminRefund(@Param("id") id: string, @Body() dto: RefundDto) {
    return this.paymentsService.adminRefund(id, dto.reason);
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  @Public()
  @SkipThrottle()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stripe webhook endpoint (internal)" })
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }
}
