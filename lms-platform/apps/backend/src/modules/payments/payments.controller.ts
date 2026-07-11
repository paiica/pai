import {
  Controller, Get, Post, Body, Req, UseGuards,
  RawBodyRequest, Headers, HttpCode, HttpStatus,
  Param, Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { Role } from "@prisma/client";
import { PaymentsService } from "./payments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { SkipThrottle } from "@nestjs/throttler";
import { CreateCheckoutDto, CourseCheckoutDto, CertificationCheckoutDto, EventCheckoutDto, RenewalCheckoutDto, RefundDto } from "./dto/checkout.dto";

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
    return this.paymentsService.createCheckoutSession(userId, dto.certification_slug, dto.application_id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("course-checkout")
  @ApiOperation({ summary: "Buy a prep course (direct enrollment after payment)" })
  courseCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: CourseCheckoutDto,
  ) {
    return this.paymentsService.createCourseCheckoutSession(userId, dto.course_id, dto.promo_code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("certification-checkout")
  @ApiOperation({ summary: "Enroll in a certification directly (no application form)" })
  certificationCheckout(
    @CurrentUser("id") userId: string,
    @Body() dto: CertificationCheckoutDto,
  ) {
    return this.paymentsService.createCertificationCheckoutSession(userId, dto.certification_slug, dto.promo_code);
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
  @Post("billing-portal")
  @ApiOperation({ summary: "Create Stripe billing portal session for card management" })
  billingPortal(@CurrentUser("id") userId: string) {
    return this.paymentsService.createBillingPortalSession(userId);
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
