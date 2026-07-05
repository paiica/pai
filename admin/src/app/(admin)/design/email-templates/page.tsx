"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Mail, Save, Loader2, ArrowUpRight, ToggleLeft, ToggleRight,
  Code2, Eye, ChevronDown, ChevronUp, RefreshCw, Tag, Send,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  { ssr: false, loading: () => <div className="h-96 bg-slate-900 rounded-xl animate-pulse" /> },
) as any;

// ─── Shell builder ────────────────────────────────────────────────────────────
// Generates the complete email HTML. Admins edit this entire document.

// Emails are viewed by external recipients, so this must never fall back to
// localhost — even in an environment where NEXT_PUBLIC_LMS_URL isn't set.
const LMS_URL = process.env.NEXT_PUBLIC_LMS_URL || "https://paii.ca";

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">

        <!-- HEADER — edit brand colours, logo, tagline here -->
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:28px 40px;text-align:center">
          <img src="${LMS_URL}/paii.logo.png" alt="Professional Artificial Intelligence Institute" width="160" style="height:auto;display:block;margin:0 auto 10px;filter:brightness(0) invert(1)" />
          <p style="margin:0;color:rgba(255,255,255,0.45);font-size:12px;letter-spacing:0.5px">paii.ca</p>
        </td></tr>

        <!-- BODY — main email content -->
        <tr><td style="padding:40px">
${body}
        </td></tr>

        <!-- FOOTER — edit copyright, links here -->
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
          <p style="margin:0;font-size:12px;color:#cbd5e1">© ${new Date().getFullYear()} Professional Artificial Intelligence Institute. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Template definitions ─────────────────────────────────────────────────────

interface TemplateDef {
  key: string;
  name: string;
  description: string;
  category: string;
  categoryColor: string;
  defaultSubject: string;
  variables?: string[];
  note?: string;
  defaultHtml: string; // full email HTML — body + shell
}

const TEMPLATES: TemplateDef[] = [
  {
    key: "verification",
    name: "Email Verification",
    description: "Sent when a user registers or requests a re-verification link.",
    category: "Account",
    categoryColor: "blue",
    defaultSubject: "Verify your PAII email address",
    variables: ["{{firstName}}", "{{link}}"],
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi {{firstName}},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Thanks for creating your PAII account. Please verify your email address to activate your learning portal.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="{{link}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">Verify Email Address</a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6">Or copy this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;word-break:break-all">{{link}}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>`),
  },
  {
    key: "reset",
    name: "Password Reset",
    description: "Sent when a user requests to reset their password.",
    category: "Account",
    categoryColor: "blue",
    defaultSubject: "Reset your PAII password",
    variables: ["{{firstName}}", "{{link}}"],
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi {{firstName}},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">We received a request to reset your PAII account password. Click the button below to choose a new password.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="{{link}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">Reset Password</a>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6">Or copy this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;word-break:break-all">{{link}}</p>
          <p style="margin:0;font-size:13px;color:#94a3b8">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.</p>`),
  },
  {
    key: "purchase",
    name: "Purchase Confirmation",
    description: "Sent after a successful Stripe payment.",
    category: "Payments",
    categoryColor: "green",
    defaultSubject: "Payment confirmed — {item}",
    variables: ["{{firstName}}", "{{itemName}}", "{{amount}}", "{{receiptLink}}"],
    note: "{item} → product name.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi {{firstName}},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your payment was successful. Here's a summary of your order.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:0 0 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#64748b;padding:6px 0;border-bottom:1px solid #e2e8f0">Item</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:6px 0;border-bottom:1px solid #e2e8f0">{{itemName}}</td></tr>
              <tr><td style="font-size:13px;color:#64748b;padding:6px 0">Amount Paid</td><td style="font-size:18px;color:#0f172a;font-weight:900;text-align:right;padding:6px 0">{{amount}}</td></tr>
            </table>
          </div>
          <p style="margin:24px 0;text-align:center">
            <a href="{{receiptLink}}" style="display:inline-block;background:#f8fafc;color:#0f172a;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;border:1px solid #e2e8f0">View Receipt →</a>
          </p>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">You can view your enrollment and start learning from your learning portal.</p>`),
  },
  {
    key: "free_enrollment",
    name: "Free Enrollment",
    description: "Sent when a student is enrolled in a free course or certification.",
    category: "Enrollment",
    categoryColor: "emerald",
    defaultSubject: "You're enrolled — {item}",
    variables: ["{{firstName}}", "{{itemName}}"],
    note: "{item} → course/cert name.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi {{firstName}},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">You've been successfully enrolled in the following program:</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center">
            <p style="margin:0;font-size:18px;font-weight:900;color:#15803d">{{itemName}}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#16a34a">Free Enrollment</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Start Learning →</a>
          </div>`),
  },
  {
    key: "certificate",
    name: "Certificate Issued",
    description: "Sent when an admin issues a certificate to a student.",
    category: "Certificates",
    categoryColor: "amber",
    defaultSubject: "Congratulations — You've earned your {acronym} certificate!",
    variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}", "{{certNumber}}", "{{expiresAt}}", "{{verificationUrl}}"],
    note: "{acronym} → cert acronym.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Congratulations, {{firstName}}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">You've successfully earned your PAII certificate. This is a significant professional achievement.</p>
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center">
            <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:#92400e;letter-spacing:2px">{{certAcronym}}</p>
            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#78350f">{{certTitle}}</p>
            <p style="margin:0;font-size:12px;color:#92400e;letter-spacing:1px">CERTIFICATE NO. {{certNumber}}</p>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Valid Until</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:4px 0">{{expiresAt}}</td></tr>
              <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Verify At</td><td style="font-size:13px;text-align:right;padding:4px 0"><a href="{{verificationUrl}}" style="color:#3b82f6">paii.ca/verify</a></td></tr>
            </table>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">View My Certificate →</a>
          </div>`),
  },
  {
    key: "exam_booked",
    name: "Exam Booked",
    description: "Sent when a student books an exam session.",
    category: "Exams",
    categoryColor: "purple",
    defaultSubject: "Exam booked — {certTitle}",
    variables: ["{{firstName}}", "{{certTitle}}", "{{sessionTitle}}", "{{examDate}}", "{{meetingLink}}"],
    note: "{certTitle} → cert title.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Exam Confirmed, {{firstName}}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your exam session for <strong>{{certTitle}}</strong> has been booked successfully.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:0 0 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#64748b;padding:5px 0">Session</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:5px 0">{{sessionTitle}}</td></tr>
              <tr><td style="font-size:13px;color:#64748b;padding:5px 0">Date &amp; Time</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:5px 0">{{examDate}}</td></tr>
              <tr><td style="font-size:13px;color:#64748b;padding:5px 0">Meeting Link</td><td style="font-size:13px;text-align:right;padding:5px 0"><a href="{{meetingLink}}" style="color:#3b82f6">Join Session</a></td></tr>
            </table>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">The exam link will become available in your portal 3 minutes before the session starts.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8">Good luck on your exam!</p>`),
  },
  {
    key: "exam_reminder",
    name: "Exam Reminder (24h Before)",
    description: "Sent automatically 24 hours before the exam — runs daily at 8 AM UTC.",
    category: "Exams",
    categoryColor: "purple",
    defaultSubject: "Reminder: Your {certTitle} exam is tomorrow",
    variables: ["{{firstName}}", "{{certTitle}}", "{{sessionTitle}}", "{{examDate}}", "{{meetingLink}}"],
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Exam Tomorrow — {{firstName}}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">This is a friendly reminder that your <strong>{{certTitle}}</strong> exam is scheduled for <strong>tomorrow</strong>.</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin:0 0 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#1e40af;padding:5px 0">Session</td><td style="font-size:13px;color:#1e3a8a;font-weight:600;text-align:right;padding:5px 0">{{sessionTitle}}</td></tr>
              <tr><td style="font-size:13px;color:#1e40af;padding:5px 0">Date &amp; Time</td><td style="font-size:13px;color:#1e3a8a;font-weight:600;text-align:right;padding:5px 0">{{examDate}}</td></tr>
              <tr><td style="font-size:13px;color:#1e40af;padding:5px 0">Meeting Link</td><td style="font-size:13px;text-align:right;padding:5px 0"><a href="{{meetingLink}}" style="color:#3b82f6">Join Session</a></td></tr>
            </table>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">Make sure you're in a quiet space with a stable internet connection. Get a good night's sleep and review your study materials tonight.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
          </div>`),
  },
  {
    key: "exam_passed",
    name: "Exam Passed",
    description: "Sent when a student submits an exam and passes.",
    category: "Exams",
    categoryColor: "purple",
    defaultSubject: "You passed your {certTitle} exam!",
    variables: ["{{firstName}}", "{{certTitle}}", "{{score}}"],
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">You Passed, {{firstName}}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Excellent work — you've passed your <strong>{{certTitle}}</strong> exam.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center">
            <p style="margin:0 0 4px;font-size:48px;font-weight:900;color:#15803d">{{score}}</p>
            <p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Passing Score</p>
          </div>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">Your certificate will be reviewed and issued by the PAII team. You'll receive a separate email once it's ready. Congratulations on this achievement!</p>`),
  },
  {
    key: "exam_failed",
    name: "Exam Failed",
    description: "Sent when a student submits an exam and does not pass.",
    category: "Exams",
    categoryColor: "purple",
    defaultSubject: "Exam result — {certTitle}",
    variables: ["{{firstName}}", "{{certTitle}}", "{{score}}", "{{attemptsLeft}}"],
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Exam Result — {{firstName}}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Unfortunately, you did not pass your <strong>{{certTitle}}</strong> exam this time.</p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center">
            <p style="margin:0 0 4px;font-size:48px;font-weight:900;color:#c2410c">{{score}}</p>
            <p style="margin:0;font-size:14px;color:#ea580c;font-weight:600;text-transform:uppercase;letter-spacing:1px">Score — Did Not Pass</p>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">You have <strong>{{attemptsLeft}}</strong> retake attempt(s) remaining. You can book a new exam session from your portal.</p>
          <div style="text-align:center;margin:24px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
          </div>`),
  },
  {
    key: "payment_failed",
    name: "Payment Failed",
    description: "Sent when a Stripe checkout session expires without payment.",
    category: "Payments",
    categoryColor: "red",
    defaultSubject: "Payment failed — {item}",
    variables: ["{{firstName}}", "{{itemName}}"],
    note: "{item} → product name.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Payment Failed — {{firstName}}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">We were unable to process your payment for <strong>{{itemName}}</strong>.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px">
            <p style="margin:0;font-size:13px;color:#dc2626;line-height:1.6">Common reasons: insufficient funds, an expired card, or the transaction was declined by your card issuer. Please verify your payment details and try again.</p>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Try Again →</a>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8">If this issue persists, please contact your bank or reach out to us at <a href="mailto:support@paii.ca" style="color:#3b82f6">support@paii.ca</a>.</p>`),
  },
  {
    key: "certificate_revoked",
    name: "Certificate Revoked",
    description: "Sent when an admin revokes a student's certificate.",
    category: "Certificates",
    categoryColor: "amber",
    defaultSubject: "Important: Your {acronym} certificate has been revoked",
    variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}", "{{certNumber}}"],
    note: "{acronym} → cert acronym.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Certificate Update — {{firstName}}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your PAII certificate has been revoked. Please review the details below.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin:0 0 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Certification</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:4px 0">{{certAcronym}} — {{certTitle}}</td></tr>
              <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Certificate No.</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:4px 0">{{certNumber}}</td></tr>
              <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Status</td><td style="font-size:13px;color:#dc2626;font-weight:700;text-align:right;padding:4px 0">Revoked</td></tr>
            </table>
          </div>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">If you believe this is an error or would like to appeal this decision, please contact us at <a href="mailto:support@paii.ca" style="color:#3b82f6">support@paii.ca</a>.</p>`),
  },
  {
    key: "application_approved",
    name: "Application Approved",
    description: "Sent when an admin approves a certification application.",
    category: "Applications",
    categoryColor: "indigo",
    defaultSubject: "Your {acronym} application has been approved!",
    variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}"],
    note: "{acronym} → cert acronym.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Application Approved, {{firstName}}!</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Great news — your application for the <strong>{{certAcronym}}</strong> certification program has been reviewed and approved.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center">
            <p style="margin:0;font-size:22px;font-weight:900;color:#15803d">{{certAcronym}}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#16a34a">{{certTitle}}</p>
            <p style="margin:8px 0 0;font-size:12px;color:#22c55e;font-weight:700;text-transform:uppercase;letter-spacing:1px">Approved ✓</p>
          </div>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">You are now officially enrolled. Log in to your portal to access your study materials and schedule your exam session.</p>
          <div style="text-align:center;margin:28px 0">
            <a href="#" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
          </div>`),
  },
  {
    key: "application_rejected",
    name: "Application Rejected",
    description: "Sent when an admin rejects a certification application.",
    category: "Applications",
    categoryColor: "indigo",
    defaultSubject: "Update on your {acronym} application",
    variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}", "{{reason}}"],
    note: "{acronym} → cert acronym.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Application Update — {{firstName}}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">After careful review, we are unable to approve your application for the <strong>{{certAcronym}} — {{certTitle}}</strong> certification at this time.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px">Reason for Decision</p>
            <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6">{{reason}}</p>
          </div>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">If you have questions or believe you meet the eligibility requirements, please contact us at <a href="mailto:support@paii.ca" style="color:#3b82f6">support@paii.ca</a>.</p>`),
  },
  {
    key: "affiliate_invite",
    name: "Sales Rep Invite",
    description: "Sent when a sales rep invites someone to join PAII as a student via the affiliate portal.",
    category: "Sales",
    categoryColor: "teal",
    defaultSubject: "{{senderName}} invited you to join PAII",
    variables: ["{{firstName}}", "{{senderName}}", "{{inviteLink}}"],
    note: "{{firstName}} → recipient name, {{senderName}} → rep's full name, {{inviteLink}} → student registration URL with referral code.",
    defaultHtml: emailShell(`          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi {{firstName}},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6"><strong>{{senderName}}</strong> has personally invited you to join the Professional Artificial Intelligence Institute (PAII) — where professionals earn industry-recognized AI certifications that set them apart.</p>
          <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px">You're Invited</p>
            <p style="margin:0;font-size:15px;color:#78350f;line-height:1.5">Create your free account and start your AI certification journey today.</p>
          </div>
          <div style="text-align:center;margin:32px 0">
            <a href="{{inviteLink}}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">Create My Account →</a>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">This invitation was sent by {{senderName}}. If you didn't expect this email, you can safely ignore it.</p>`),
  },
];

// ─── Category styling ─────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { border: string; chip: string }> = {
  blue:    { border: "border-l-blue-400",    chip: "bg-blue-50 text-blue-600 border-blue-200" },
  green:   { border: "border-l-green-400",   chip: "bg-green-50 text-green-600 border-green-200" },
  emerald: { border: "border-l-emerald-400", chip: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  amber:   { border: "border-l-amber-400",   chip: "bg-amber-50 text-amber-700 border-amber-200" },
  purple:  { border: "border-l-purple-400",  chip: "bg-purple-50 text-purple-600 border-purple-200" },
  red:     { border: "border-l-red-400",     chip: "bg-red-50 text-red-600 border-red-200" },
  indigo:  { border: "border-l-indigo-400",  chip: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  teal:    { border: "border-l-teal-400",    chip: "bg-teal-50 text-teal-600 border-teal-200" },
};

// ─── API helper ───────────────────────────────────────────────────────────────

function settingsFetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

// ─── Template card ────────────────────────────────────────────────────────────

interface CardProps {
  tpl: TemplateDef;
  subject: string;
  enabled: boolean;
  customHtml: string;
  onSubjectChange: (v: string) => void;
  onEnabledChange: (v: boolean) => void;
  onHtmlChange: (v: string) => void;
  onSendTest: () => void;
  testing: boolean;
}

function TemplateCard({ tpl, subject, enabled, customHtml, onSubjectChange, onEnabledChange, onHtmlChange, onSendTest, testing }: CardProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  const hasCustomHtml = customHtml.trim().length > 0;
  const editorValue = hasCustomHtml ? customHtml : tpl.defaultHtml;
  const categoryStyle = CATEGORY_STYLES[tpl.categoryColor] ?? CATEGORY_STYLES.blue;

  return (
    <div className={`card overflow-hidden border-l-4 ${categoryStyle.border}`}>
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${categoryStyle.chip}`}>
              {tpl.category}
            </span>
            {hasCustomHtml && (
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded uppercase tracking-wide">Custom</span>
            )}
          </div>
          <h2 className="font-semibold text-navy-900 text-sm">{tpl.name}</h2>
          <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{tpl.description}</p>
        </div>
        <button
          type="button"
          onClick={onSendTest}
          disabled={testing}
          className="shrink-0 mt-1 flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-800 border border-slate-200 hover:border-navy-300 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
          title="Send this template with sample data to your own inbox"
        >
          {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Test
        </button>
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className="shrink-0 mt-1 transition-opacity hover:opacity-80"
          title={enabled ? "Disable this email" : "Enable this email"}
        >
          {enabled
            ? <ToggleRight size={30} className="text-green-500" />
            : <ToggleLeft size={30} className="text-slate-300" />}
        </button>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Subject line */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder={tpl.defaultSubject}
            className="input-base"
          />
          <p className="text-xs text-slate-400 mt-1.5">
            {tpl.note && <span>{tpl.note} </span>}Leave blank to use the default.
          </p>
        </div>

        {/* Variables */}
        {tpl.variables && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag size={11} className="text-slate-400" />
            {tpl.variables.map((v) => (
              <code key={v} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{v}</code>
            ))}
          </div>
        )}

        {/* HTML editor section */}
        <div>
          <button
            type="button"
            onClick={() => setShowEditor(!showEditor)}
            className="flex items-center gap-2 text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors"
          >
            <Code2 size={14} />
            {showEditor ? "Hide HTML Editor" : "Edit HTML Template"}
            {showEditor ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showEditor && (
            <div className="mt-3 space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors ${!previewMode ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Code2 size={12} /> Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors ${previewMode ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Eye size={12} /> Preview
                  </button>
                </div>
                {hasCustomHtml && (
                  <button
                    type="button"
                    onClick={() => onHtmlChange("")}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                  >
                    <RefreshCw size={11} /> Reset to default
                  </button>
                )}
              </div>

              {/* Preview (iframe) or code editor */}
              {previewMode ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-1.5 text-xs text-slate-500 font-medium border-b border-slate-200 flex items-center gap-1.5">
                    <Eye size={11} />
                    Full email preview — header, body &amp; footer all editable in Code view
                  </div>
                  <iframe
                    srcDoc={editorValue}
                    title={`Preview: ${tpl.name}`}
                    className="w-full border-0 block"
                    style={{ height: 560, background: "#f7f8fa" }}
                  />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <MonacoEditor
                    height="480px"
                    language="html"
                    theme="vs-dark"
                    value={editorValue}
                    onChange={(val: string | undefined) => onHtmlChange(val ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      padding: { top: 12, bottom: 12 },
                      folding: true,
                    }}
                  />
                </div>
              )}

              <p className="text-xs text-slate-400">
                The editor contains the <strong>complete email HTML</strong> — you can edit the header, body, and footer freely.
                Use <code className="bg-slate-100 px-1 rounded font-mono text-xs">{`{{variable}}`}</code> placeholders for dynamic values.
                {hasCustomHtml ? " Click \"Reset to default\" to restore the original template." : " Your changes will override the system default when saved."}
              </p>
            </div>
          )}
        </div>

        {/* Disabled notice */}
        {!enabled && (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-medium">This email is disabled and will not be sent.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const { accessToken } = useAuthStore();

  const { data: settings, mutate: mutateSettings } = useSWR(
    accessToken ? ["/site-settings", accessToken] : null,
    ([url, t]) => settingsFetcher(url, t),
  );

  const [subjects,   setSubjects]   = useState<Record<string, string>>({});
  const [enabled,    setEnabled]    = useState<Record<string, boolean>>({});
  const [customHtml, setCustomHtml] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  async function sendTest(key: string) {
    setTestingKey(key);
    try {
      const r = await api.post<{ sent: boolean; reason?: string }>(`/mail/templates/${key}/test-send`, {}, accessToken!);
      const result = (r as any).data ?? r;
      if (result.sent) toast.success("Test email sent — check your inbox");
      else toast.error(`Not sent: ${result.reason ?? "unknown error"}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send test email");
    } finally {
      setTestingKey(null);
    }
  }

  useEffect(() => {
    if (!settings) return;
    const s: Record<string, string> = {};
    const e: Record<string, boolean> = {};
    const h: Record<string, string> = {};
    TEMPLATES.forEach((t) => {
      s[t.key] = settings[`email_tpl_${t.key}_subject`] ?? "";
      e[t.key] = settings[`email_tpl_${t.key}_enabled`] !== "false";
      h[t.key] = settings[`email_tpl_${t.key}_html`] ?? "";
    });
    setSubjects(s);
    setEnabled(e);
    setCustomHtml(h);
  }, [settings]);

  async function saveAll(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      TEMPLATES.forEach((t) => {
        body[`email_tpl_${t.key}_subject`] = subjects[t.key] ?? "";
        body[`email_tpl_${t.key}_enabled`] = enabled[t.key] !== false ? "true" : "false";
        body[`email_tpl_${t.key}_html`]    = customHtml[t.key] ?? "";
      });
      await api.patch("/site-settings", body, accessToken!);
      await mutateSettings();
      toast.success("Email templates saved");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail size={20} className="text-navy-600" />
          <h1 className="text-2xl font-display font-black text-navy-900">Email Templates</h1>
        </div>
        <p className="text-slate-500 text-sm">Manage subjects, enable/disable, and edit the full HTML for each transactional email — including the header and footer.</p>
      </div>

      {/* FROM address notice */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-700">FROM address &amp; Resend API key</p>
          <p className="text-xs text-slate-400 mt-0.5">The sender address used for all emails is configured in APIs Settings.</p>
        </div>
        <Link href="/settings/apis" className="shrink-0 flex items-center gap-1 text-xs font-semibold text-navy-600 hover:text-navy-800 transition-colors">
          APIs Settings <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 font-medium">Categories:</span>
        {Object.entries({ Account: "blue", Enrollment: "emerald", Payments: "green", Exams: "purple", Certificates: "amber", Applications: "indigo", Sales: "teal" }).map(([label, color]) => (
          <span key={label} className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${CATEGORY_STYLES[color].chip}`}>{label}</span>
        ))}
      </div>

      <form onSubmit={saveAll} className="space-y-4">
        {TEMPLATES.map((tpl) => (
          <TemplateCard
            key={tpl.key}
            tpl={tpl}
            subject={subjects[tpl.key] ?? ""}
            enabled={enabled[tpl.key] !== false}
            customHtml={customHtml[tpl.key] ?? ""}
            onSubjectChange={(v) => setSubjects((prev) => ({ ...prev, [tpl.key]: v }))}
            onEnabledChange={(v) => setEnabled((prev) => ({ ...prev, [tpl.key]: v }))}
            onHtmlChange={(v) => setCustomHtml((prev) => ({ ...prev, [tpl.key]: v }))}
            onSendTest={() => sendTest(tpl.key)}
            testing={testingKey === tpl.key}
          />
        ))}

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save All Templates
        </button>
      </form>
    </div>
  );
}
