import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const RECENT_DAYS = 7;
const RECENT_LIST_LIMIT = 8;

@Injectable()
export class AdminOverviewService {
  constructor(private prisma: PrismaService) {}

  // One screen answering "what's new, and what needs me right now" — every
  // count here is a real actionable queue (something only a staff action can
  // clear), not a vanity metric. Each item carries enough to deep-link
  // straight into the right filtered view rather than just a raw count.
  async getOverview() {
    const since = new Date(Date.now() - RECENT_DAYS * 86400000);

    const [
      paymentVerificationCount,
      pendingReviewCount,
      coursesPendingCount,
      affiliatesPendingCount,
      pduPendingCount,
      institutionsPastDueCount,
      newStudents,
      newStudentsCount,
      recentApplications,
      newApplicationsCount,
    ] = await Promise.all([
      this.prisma.application.count({ where: { status: "payment_submitted" } }),
      this.prisma.application.count({ where: { status: "pending_review" } }),
      this.prisma.course.count({ where: { approval_status: "pending" } }),
      this.prisma.affiliateProfile.count({ where: { status: "pending" } }),
      this.prisma.externalPduSubmission.count({ where: { status: "pending" } }),
      this.prisma.institutionSubscription.count({ where: { status: "past_due" } }),
      this.prisma.user.findMany({
        where: { role: "student", created_at: { gte: since } },
        select: { id: true, email: true, created_at: true, profile: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: "desc" },
        take: RECENT_LIST_LIMIT,
      }),
      this.prisma.user.count({ where: { role: "student", created_at: { gte: since } } }),
      this.prisma.application.findMany({
        where: { created_at: { gte: since } },
        select: {
          id: true, full_name: true, email: true, status: true, created_at: true,
          certification: { select: { acronym: true, title: true } },
        },
        orderBy: { created_at: "desc" },
        take: RECENT_LIST_LIMIT,
      }),
      this.prisma.application.count({ where: { created_at: { gte: since } } }),
    ]);

    const needs_attention = [
      {
        key: "payment_verification",
        label: "Payments to verify",
        description: "Applications where Stripe confirmed payment but it hasn't been manually verified yet",
        count: paymentVerificationCount,
        href: "/applications?status=payment_submitted",
      },
      {
        key: "pending_review",
        label: "Applications to review",
        description: "Verified applications waiting on an approve/reject decision",
        count: pendingReviewCount,
        href: "/applications?status=pending_review",
      },
      {
        key: "courses_pending",
        label: "Courses to approve",
        description: "Public courses submitted for marketplace review",
        count: coursesPendingCount,
        href: "/courses?pending=true",
      },
      {
        key: "affiliates_pending",
        label: "Affiliate signups to approve",
        description: "New affiliate accounts waiting on approval",
        count: affiliatesPendingCount,
        href: "/affiliates",
      },
      {
        key: "pdu_pending",
        label: "External PDU requests",
        description: "Continuing-education claims waiting on review",
        count: pduPendingCount,
        href: "/certificates/external-pdus",
      },
      {
        key: "institutions_past_due",
        label: "Institutions with failed billing",
        description: "Institution subscriptions past due on payment",
        count: institutionsPastDueCount,
        href: "/institutions",
      },
    ];

    return {
      needs_attention,
      needs_attention_total: needs_attention.reduce((sum, i) => sum + i.count, 0),
      whats_new: {
        since_days: RECENT_DAYS,
        new_students_count: newStudentsCount,
        new_students: newStudents.map((u) => ({
          id: u.id,
          name: u.profile?.first_name ? `${u.profile.first_name} ${u.profile.last_name ?? ""}`.trim() : u.email,
          email: u.email,
          created_at: u.created_at,
        })),
        new_applications_count: newApplicationsCount,
        new_applications: recentApplications.map((a) => ({
          id: a.id,
          full_name: a.full_name,
          email: a.email,
          status: a.status,
          certification: a.certification ? `${a.certification.acronym}` : null,
          created_at: a.created_at,
        })),
      },
    };
  }
}
