"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Loader2, Globe, EyeOff, FileText, Layout } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Page = {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  is_published: boolean;
  updated_at: string;
};

interface SitePageDef {
  slug: string;
  title: string;
  description: string;
  defaultMeta: string;
  defaultHtml: string;
  catchAll?: boolean; // served by /[slug] catch-all (no dedicated page file)
}

const SITE_PAGES: SitePageDef[] = [
  {
    slug: "about",
    title: "About",
    description: "Mission, values, advisory board, accreditation",
    defaultMeta: "Learn about the Professional AI Institute — our mission, values, advisory board, and commitment to rigorous AI certification.",
    defaultHtml: `<section style="padding:64px 0;background:#fff">
  <div style="max-width:768px;margin:0 auto;padding:0 24px">
    <p style="display:inline-block;background:#ccfbf1;color:#0f766e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 12px;border-radius:99px;margin-bottom:16px">Our Mission</p>
    <h2 style="font-size:1.875rem;font-weight:900;color:#171527;margin:0 0 20px">Closing the AI Credibility Gap</h2>
    <p style="color:#171527;line-height:1.7;font-size:15px;margin:0 0 20px">In 2023, we noticed a growing problem: organizations were scrambling to implement AI, professionals were scrambling to learn AI, but there was no trusted credential standard to bridge the gap. LinkedIn courses and YouTube tutorials don't signal professional competence to employers. MBAs don't cover AI adequately. Engineering degrees are inaccessible to most professionals.</p>
    <p style="color:#171527;line-height:1.7;font-size:15px;margin:0 0 20px">PAI was founded to solve that problem — to create the professional certification infrastructure for AI, modeled after institutions like the CPA, PMI, and CSI that define credentialing in other professions.</p>
    <p style="color:#171527;line-height:1.7;font-size:15px;margin:0">We build programs that are rigorous enough to mean something, accessible enough for working professionals, and practical enough to create immediate impact.</p>
  </div>
</section>

<section style="padding:64px 0;background:#f5f0eb">
  <div style="max-width:1120px;margin:0 auto;padding:0 24px">
    <div style="text-align:center;margin-bottom:48px">
      <p style="display:inline-block;background:#ccfbf1;color:#0f766e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 12px;border-radius:99px;margin-bottom:16px">Our Values</p>
      <h2 style="font-size:1.875rem;font-weight:900;color:#171527;margin:0">What We Stand For</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px">
      <div style="background:#fff;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Credential Integrity</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Our certifications mean something. Every exam question, every curriculum module, and every assessment criterion undergoes independent review. We never compromise on rigor.</p></div>
      <div style="background:#fff;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Global Accessibility</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">World-class AI credentials should be accessible to professionals everywhere. We offer flexible payment, translated materials, and region-adjusted pricing.</p></div>
      <div style="background:#fff;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Community-Driven</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">PAI is built by practitioners, for practitioners. Our curriculum is shaped by the 3,200+ professionals in our community and updated quarterly.</p></div>
      <div style="background:#fff;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Career Impact</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Every program decision is measured against one question: does this help our learners advance their careers? If not, we don't include it.</p></div>
    </div>
  </div>
</section>

<section style="padding:64px 0;background:#fff">
  <div style="max-width:1120px;margin:0 auto;padding:0 24px">
    <div style="text-align:center;margin-bottom:48px">
      <p style="display:inline-block;background:#ccfbf1;color:#0f766e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 12px;border-radius:99px;margin-bottom:16px">Advisory Board</p>
      <h2 style="font-size:1.875rem;font-weight:900;color:#171527;margin:0 0 16px">Guided by Industry Leaders</h2>
      <p style="color:#948e84;font-size:15px;max-width:480px;margin:0 auto">Our programs are shaped by active practitioners and thought leaders from the world's leading organizations.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;background:#8b5cf6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">LC</div><div><div style="font-weight:700;color:#171527;font-size:14px">Dr. Lisa Chen</div><div style="font-size:12px;color:#948e84;margin-top:2px">Chief AI Officer, Magna International</div></div></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;background:#3b82f6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">JO</div><div><div style="font-weight:700;color:#171527;font-size:14px">James Osei</div><div style="font-size:12px;color:#948e84;margin-top:2px">Former VP Engineering, Google DeepMind</div></div></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;background:#10b981;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">PS</div><div><div style="font-weight:700;color:#171527;font-size:14px">Priya Sharma</div><div style="font-size:12px;color:#948e84;margin-top:2px">AI Policy Lead, Government of Canada</div></div></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;background:#14b8a6;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">MR</div><div><div style="font-weight:700;color:#171527;font-size:14px">Marcus Rivera</div><div style="font-size:12px;color:#948e84;margin-top:2px">Partner, McKinsey Digital</div></div></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;background:#f43f5e;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">FA</div><div><div style="font-weight:700;color:#171527;font-size:14px">Dr. Fatima Al-Hassan</div><div style="font-size:12px;color:#948e84;margin-top:2px">Professor of AI Ethics, University of Toronto</div></div></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:20px;display:flex;align-items:center;gap:16px"><div style="width:52px;height:52px;background:#1e3a5f;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">TW</div><div><div style="font-weight:700;color:#171527;font-size:14px">Tom Whitfield</div><div style="font-size:12px;color:#948e84;margin-top:2px">CTO, Shopify</div></div></div>
    </div>
  </div>
</section>

<section style="padding:64px 0;background:#f5f0eb;text-align:center">
  <div style="max-width:768px;margin:0 auto;padding:0 24px">
    <p style="display:inline-block;background:#ccfbf1;color:#0f766e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 12px;border-radius:99px;margin-bottom:16px">Accreditation</p>
    <h2 style="font-size:1.875rem;font-weight:900;color:#171527;margin:0 0 20px">Standards-Aligned Credentialing</h2>
    <p style="color:#171527;line-height:1.7;font-size:15px;margin:0 0 40px">PAI's certification framework aligns with ISO 17024 — the international standard for personnel certification bodies. Our exam development follows best practices from the National Commission for Certifying Agencies (NCCA).</p>
    <a href="/certifications" style="display:inline-flex;align-items:center;gap:8px;background:#171527;color:#fff;font-weight:700;padding:14px 32px;border-radius:12px;font-size:14px;text-decoration:none">Explore Certifications →</a>
  </div>
</section>`,
  },
  {
    slug: "faq",
    title: "FAQ",
    description: "Frequently asked questions by category",
    defaultMeta: "Answers to the most common questions about PAI certifications, exams, enrollment, and credentials.",
    defaultHtml: `<section style="padding:64px 0;background:#fff">
  <div style="max-width:768px;margin:0 auto;padding:0 24px">

    <h2 style="font-size:1.125rem;font-weight:900;color:#171527;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #ddd8d0">Certifications &amp; Programs</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px">
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Do I need a technical background to enroll?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">No. PAI certifications are designed for business professionals, not engineers. CAIP, CAIM, and CAIE require no programming or data science background. CAIDA benefits from familiarity with data tools but doesn't require coding.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Which certification should I start with?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">87% of PAI professionals start with CAIP regardless of seniority. It establishes a common foundation. After CAIP, choose CAIM (management), CAIDA (data), or CAIE (executive) based on your role.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Can I take multiple certifications?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Yes. Many professionals complete CAIP followed by CAIM or CAIDA. CAIP alumni receive a 15% discount on subsequent certifications.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Are there prerequisites?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">CAIP has no prerequisites. CAIM and CAIDA recommend CAIP but don't require it. CAIE is designed for senior professionals and recommends 3+ years in a leadership role.</p></div>
    </div>

    <h2 style="font-size:1.125rem;font-weight:900;color:#171527;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #ddd8d0">Application &amp; Enrollment</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px">
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">How does the application process work?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">You submit a brief application (5 minutes), pay the enrollment fee, and PAI reviews your application within 3–5 business days. You receive your LMS access credentials via email upon approval.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Why do I need to apply?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">PAI's application process ensures credential integrity and helps us understand your professional context. Applications are rarely declined — it's not an exclusionary process.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">What if my application is rejected?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">You'll receive a full refund within 5–7 business days. In most cases, rejections come with guidance on reapplying or on alternative pathways.</p></div>
    </div>

    <h2 style="font-size:1.125rem;font-weight:900;color:#171527;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #ddd8d0">The Exam</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px">
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">How is the exam delivered?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Online, proctored through our secure testing platform. You can take it from home or office. You'll need a webcam, government ID, and a quiet space.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">What happens if I fail?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Two retakes are included in your enrollment fee. If you fail a third time, additional retakes are $99 each. Detailed score reports guide your preparation.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">How long is the exam?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">CAIP, CAIM, and CAIDA: 90 minutes, 75 questions. CAIE: 75 minutes, 60 questions. All are multiple-choice.</p></div>
    </div>

    <h2 style="font-size:1.125rem;font-weight:900;color:#171527;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #ddd8d0">Credentials &amp; Recognition</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px">
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">How long is the certification valid?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">CAIP, CAIM, and CAIDA are valid for 2 years. CAIE is valid for 3 years. Renewal involves a shorter recertification exam or continuing education credits.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">How do employers verify my credential?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Each certificate includes a unique ID and QR code. Employers can verify instantly at paii.ca/verify. You can also add your credential directly to LinkedIn.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Are PAI credentials recognized internationally?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Yes. PAI credentials are recognized by employers across 48 countries. Our ISO 17024-aligned framework aligns with international standards for professional certifications.</p></div>
    </div>

    <h2 style="font-size:1.125rem;font-weight:900;color:#171527;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid #ddd8d0">Payments &amp; Refunds</h2>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:48px">
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">What payment methods are accepted?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">All major credit cards (Visa, Mastercard, Amex), debit cards, and bank transfers for corporate orders. Payments are processed via Stripe.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Is there a refund policy?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Full refund within 30 days of enrollment if you haven't passed the exam. No refunds after exam attempt. Corporate orders: contact corporate@paii.ca.</p></div>
      <div style="background:#f5f0eb;border-radius:16px;padding:20px;border:1px solid #ddd8d0"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Is there financing available?</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Yes. We partner with third-party financing providers. Contact info@paii.ca for details on installment payment options.</p></div>
    </div>

    <div style="background:#1e293b;border-radius:16px;padding:28px;text-align:center;color:#fff">
      <h3 style="font-weight:700;font-size:1.25rem;margin:0 0 8px">Still have questions?</h3>
      <p style="font-size:14px;margin:0 0 20px;opacity:0.8">Our team responds within 24 hours on business days.</p>
      <a href="mailto:info@paii.ca" style="display:inline-flex;align-items:center;gap:8px;background:#171527;color:#fff;font-weight:700;padding:12px 28px;border-radius:12px;font-size:14px;text-decoration:none">Contact Us →</a>
    </div>

  </div>
</section>`,
  },
  {
    slug: "corporate",
    title: "Corporate",
    description: "Group pricing, features, and enterprise plans",
    defaultMeta: "Upskill your entire organization with PAI's group certification programs. Volume pricing, dedicated support, and custom learning paths.",
    defaultHtml: `<section style="padding:64px 0;background:#fff">
  <div style="max-width:1120px;margin:0 auto;padding:0 24px">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px">
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Admin Analytics Dashboard</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Track completion rates, exam scores, and progress across your entire team. Export reports for executive stakeholders.</p></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Bulk Enrollment</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Enroll entire departments instantly. Manage seats, assign programs, and monitor progress from a single admin panel.</p></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Custom Learning Paths</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">For Enterprise clients, we build role-specific learning tracks aligned to your organization's AI adoption roadmap.</p></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Dedicated Account Manager</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">For Organization and Enterprise tiers, your dedicated manager handles everything from onboarding to completion.</p></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">Executive Reporting</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Quarterly certification progress reports, ROI analysis, and skills gap assessments for HR and executive teams.</p></div>
      <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:1rem;margin:0 0 8px">30-Day Pilot Available</h3><p style="color:#171527;font-size:14px;line-height:1.6;margin:0">Not sure? We offer a 30-day pilot enrollment for up to 5 seats at full features so you can evaluate before committing.</p></div>
    </div>
  </div>
</section>

<section style="padding:64px 0;background:#f5f0eb">
  <div style="max-width:1120px;margin:0 auto;padding:0 24px">
    <div style="text-align:center;margin-bottom:48px">
      <p style="display:inline-block;background:#ccfbf1;color:#0f766e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:4px 12px;border-radius:99px;margin-bottom:16px">Group Pricing</p>
      <h2 style="font-size:1.875rem;font-weight:900;color:#171527;margin:0 0 12px">Volume Pricing Tiers</h2>
      <p style="color:#948e84;font-size:15px;max-width:480px;margin:0 auto">All programs available. Mix and match certifications across your team.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">
      <div style="background:#fff;border-radius:20px;border:1px solid #ddd8d0;padding:28px;display:flex;flex-direction:column">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#948e84;margin-bottom:4px">3–9 seats</div>
        <div style="font-size:1.5rem;font-weight:900;color:#171527;margin-bottom:4px">Team</div>
        <div style="font-weight:700;color:#171527;font-size:14px;margin-bottom:4px">15% off</div>
        <div style="font-size:1.75rem;font-weight:900;color:#171527;margin:12px 0 20px">From $1,101/seat</div>
        <ul style="list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:10px;flex:1">
          <li style="font-size:14px;color:#171527">✓ All certification programs</li>
          <li style="font-size:14px;color:#171527">✓ Team dashboard</li>
          <li style="font-size:14px;color:#171527">✓ Bulk enrollment</li>
          <li style="font-size:14px;color:#171527">✓ Email support</li>
        </ul>
        <a href="mailto:corporate@paii.ca" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#171527;color:#fff;font-weight:700;padding:12px;border-radius:12px;font-size:14px;text-decoration:none">Get Quote →</a>
      </div>
      <div style="background:#fff;border-radius:20px;border:2px solid #99f6e4;padding:28px;display:flex;flex-direction:column;box-shadow:0 4px 24px rgba(20,184,166,0.15)">
        <div style="font-size:11px;font-weight:700;background:#14b8a6;color:#fff;padding:3px 10px;border-radius:99px;width:fit-content;margin-bottom:12px">Most Popular</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#948e84;margin-bottom:4px">10–49 seats</div>
        <div style="font-size:1.5rem;font-weight:900;color:#171527;margin-bottom:4px">Organization</div>
        <div style="font-weight:700;color:#171527;font-size:14px;margin-bottom:4px">25% off</div>
        <div style="font-size:1.75rem;font-weight:900;color:#171527;margin:12px 0 20px">From $971/seat</div>
        <ul style="list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:10px;flex:1">
          <li style="font-size:14px;color:#171527">✓ All certification programs</li>
          <li style="font-size:14px;color:#171527">✓ Admin analytics dashboard</li>
          <li style="font-size:14px;color:#171527">✓ Custom onboarding</li>
          <li style="font-size:14px;color:#171527">✓ Dedicated account manager</li>
          <li style="font-size:14px;color:#171527">✓ Quarterly progress reports</li>
        </ul>
        <a href="mailto:corporate@paii.ca" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#14b8a6;color:#fff;font-weight:700;padding:12px;border-radius:12px;font-size:14px;text-decoration:none">Get Quote →</a>
      </div>
      <div style="background:#fff;border-radius:20px;border:1px solid #ddd8d0;padding:28px;display:flex;flex-direction:column">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#948e84;margin-bottom:4px">50+ seats</div>
        <div style="font-size:1.5rem;font-weight:900;color:#171527;margin-bottom:4px">Enterprise</div>
        <div style="font-weight:700;color:#171527;font-size:14px;margin-bottom:4px">Custom pricing</div>
        <div style="font-size:1.75rem;font-weight:900;color:#171527;margin:12px 0 20px">Contact us</div>
        <ul style="list-style:none;padding:0;margin:0 0 24px;display:flex;flex-direction:column;gap:10px;flex:1">
          <li style="font-size:14px;color:#171527">✓ All certification programs</li>
          <li style="font-size:14px;color:#171527">✓ White-label options</li>
          <li style="font-size:14px;color:#171527">✓ Custom curriculum modules</li>
          <li style="font-size:14px;color:#171527">✓ On-site kickoff workshops</li>
          <li style="font-size:14px;color:#171527">✓ Executive reporting</li>
          <li style="font-size:14px;color:#171527">✓ SLA guarantee</li>
        </ul>
        <a href="mailto:corporate@paii.ca" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#171527;color:#fff;font-weight:700;padding:12px;border-radius:12px;font-size:14px;text-decoration:none">Contact Sales →</a>
      </div>
    </div>
  </div>
</section>

<section style="padding:64px 0;background:#171527;text-align:center">
  <div style="max-width:640px;margin:0 auto;padding:0 24px">
    <h2 style="font-size:1.875rem;font-weight:900;color:#fff;margin:0 0 16px">Ready to Get Started?</h2>
    <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7;margin:0 0 32px">Contact our corporate team for a custom proposal, pilot access, or to discuss your organization's specific requirements.</p>
    <a href="mailto:corporate@paii.ca" style="display:inline-flex;align-items:center;gap:8px;background:#fff;color:#171527;font-weight:700;padding:14px 32px;border-radius:12px;font-size:14px;text-decoration:none">corporate@paii.ca →</a>
  </div>
</section>`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "Privacy policy and data rights",
    defaultMeta: "Professional AI Institute Privacy Policy.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 8px">Privacy Policy</h1>
<p style="color:#948e84;font-size:13px;margin:0 0 40px">Last updated: June 1, 2026</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Information We Collect</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">We collect information you provide directly to us, including your name, email address, professional background, and payment information when you apply for a certification program. We also collect usage data about how you interact with our platform.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">How We Use Your Information</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">We use the information we collect to process your application, deliver our certification programs, communicate with you about your enrollment, issue your credential, and improve our services. We do not sell your personal information to third parties.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Data Storage &amp; Security</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">Your data is stored on encrypted servers in Canada and the United States. We use industry-standard security practices including TLS encryption, access controls, and regular security audits. Payment data is processed via Stripe and never stored on our servers.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Your Rights (PIPEDA / GDPR)</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">You have the right to access, correct, or delete your personal information. You may also request a copy of your data in a portable format. To exercise these rights, contact <a href="mailto:privacy@paii.ca" style="color:#171527;font-weight:600">privacy@paii.ca</a>.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Cookies</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">We use essential cookies for authentication and performance cookies (via analytics tools) to understand how our site is used. You can control non-essential cookies via your browser settings.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Contact</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0">For privacy-related questions, contact our Privacy Officer at <a href="mailto:privacy@paii.ca" style="color:#171527;font-weight:600">privacy@paii.ca</a> or write to: Professional AI Institute, Toronto, ON, Canada.</p>`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    description: "Terms and conditions of enrollment",
    defaultMeta: "Professional AI Institute Terms of Service.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 8px">Terms of Service</h1>
<p style="color:#948e84;font-size:13px;margin:0 0 40px">Last updated: June 1, 2026</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Acceptance of Terms</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">By applying for or enrolling in a PAI certification program, you agree to be bound by these Terms of Service. If you do not agree, do not proceed with enrollment.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Enrollment &amp; Access</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">Upon approval of your application and receipt of payment, you receive personal, non-transferable access to the course materials for the enrolled certification. Access is for individual use only and may not be shared.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Refund Policy</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">You are entitled to a full refund within 30 days of enrollment if you have not attempted the final certification exam. No refunds are issued after an exam attempt or after the 30-day window. Application rejections result in an automatic full refund within 5–7 business days.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Exam Integrity</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">You agree to complete all assessments independently without assistance from others. Any breach of exam integrity, including sharing questions, using unauthorized materials, or impersonating another individual, will result in immediate revocation of your credential and permanent disqualification from PAI programs.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Credential Use</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">PAI credentials are issued to the individual who completed the program. You may represent your credential accurately on professional profiles and resumes. Misrepresentation of PAI credentials is prohibited and may result in legal action.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Intellectual Property</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0 0 16px">All course materials, videos, quizzes, and content are the intellectual property of the Professional AI Institute. You may not reproduce, distribute, or create derivative works from our content without written permission.</p>

<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">Contact</h2>
<p style="color:#171527;line-height:1.7;font-size:14px;margin:0">For questions about these terms, contact <a href="mailto:legal@paii.ca" style="color:#171527;font-weight:600">legal@paii.ca</a>.</p>`,
  },
  {
    slug: "careers",
    title: "Careers",
    catchAll: true,
    description: "Open roles and working at PAI",
    defaultMeta: "Join the Professional AI Institute team. Explore open roles and our mission-driven culture.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 12px">Careers at PAI</h1>
<p style="color:#948e84;font-size:15px;line-height:1.7;margin:0 0 40px">We're building the credential standard for the AI era. Join us.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:0 0 12px">Open Roles</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0">No open roles at this time. Check back soon or send your resume to <a href="mailto:careers@paii.ca" style="color:#171527;font-weight:600">careers@paii.ca</a>.</p>`,
  },
  {
    slug: "resources",
    title: "Resources",
    catchAll: true,
    description: "Learning resources, guides, and tools",
    defaultMeta: "Free AI learning resources, guides, and tools from the Professional AI Institute.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 12px">Resources</h1>
<p style="color:#948e84;font-size:15px;line-height:1.7;margin:0 0 40px">Free guides, templates, and tools to accelerate your AI journey.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:0 0 12px">Coming Soon</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0">We're compiling our best resources. Add your content here.</p>`,
  },
  {
    slug: "contact",
    title: "Contact",
    catchAll: true,
    description: "Get in touch with PAI",
    defaultMeta: "Contact the Professional AI Institute. Reach our team for enrollment questions, corporate inquiries, and support.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 12px">Contact Us</h1>
<p style="color:#948e84;font-size:15px;line-height:1.7;margin:0 0 40px">Our team is here to help.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:32px">
  <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">General Enquiries</h3><p style="color:#948e84;font-size:14px;margin:0"><a href="mailto:info@paii.ca" style="color:#171527;font-weight:600">info@paii.ca</a></p></div>
  <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Corporate &amp; Partnerships</h3><p style="color:#948e84;font-size:14px;margin:0"><a href="mailto:corporate@paii.ca" style="color:#171527;font-weight:600">corporate@paii.ca</a></p></div>
  <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Privacy &amp; Legal</h3><p style="color:#948e84;font-size:14px;margin:0"><a href="mailto:privacy@paii.ca" style="color:#171527;font-weight:600">privacy@paii.ca</a></p></div>
  <div style="background:#faf7f4;border-radius:16px;border:1px solid #ddd8d0;padding:24px"><h3 style="font-weight:700;color:#171527;font-size:15px;margin:0 0 8px">Press &amp; Media</h3><p style="color:#948e84;font-size:14px;margin:0"><a href="mailto:press@paii.ca" style="color:#171527;font-weight:600">press@paii.ca</a></p></div>
</div>`,
  },
  {
    slug: "partners",
    title: "Partners",
    catchAll: true,
    description: "Partner organizations and integrations",
    defaultMeta: "PAI partner organizations, academic institutions, and technology integrations.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 12px">Partners</h1>
<p style="color:#948e84;font-size:15px;line-height:1.7;margin:0 0 40px">We work with leading organizations to advance professional AI credentialing.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:0 0 12px">Partner With Us</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0">Interested in partnering with PAI? Reach out at <a href="mailto:partnerships@paii.ca" style="color:#171527;font-weight:600">partnerships@paii.ca</a>.</p>`,
  },
  {
    slug: "press",
    title: "Press",
    catchAll: true,
    description: "Media coverage, press releases, brand assets",
    defaultMeta: "PAI press room — media coverage, press releases, and brand assets for journalists and media partners.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 12px">Press &amp; Media</h1>
<p style="color:#948e84;font-size:15px;line-height:1.7;margin:0 0 40px">For media inquiries, interview requests, and press assets.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:0 0 12px">Media Contact</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0 0 32px">Contact our communications team at <a href="mailto:press@paii.ca" style="color:#171527;font-weight:600">press@paii.ca</a>.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:0 0 12px">Press Releases</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0">Add press releases and announcements here.</p>`,
  },
  {
    slug: "accreditation",
    title: "Accreditation",
    catchAll: true,
    description: "Credentialing framework and standards compliance",
    defaultMeta: "PAI's ISO 17024-aligned credentialing framework and accreditation standards.",
    defaultHtml: `<h1 style="font-size:2rem;font-weight:900;color:#171527;margin:0 0 12px">Accreditation</h1>
<p style="color:#948e84;font-size:15px;line-height:1.7;margin:0 0 40px">PAI's certification framework meets the highest international standards for professional credentialing.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:0 0 12px">ISO 17024 Alignment</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0 0 16px">PAI's programs are developed in alignment with ISO 17024, the international standard for personnel certification bodies.</p>
<h2 style="font-size:1.125rem;font-weight:700;color:#171527;margin:32px 0 12px">NCCA Best Practices</h2>
<p style="color:#171527;font-size:14px;line-height:1.7;margin:0">Our exam development follows best practices from the National Commission for Certifying Agencies (NCCA).</p>`,
  },
];

export default function PagesListPage() {
  const { accessToken, refreshTokens } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/pages", accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    }
  );

  const pages: Page[] = data?.data ?? data ?? [];

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [settingUp,     setSettingUp]     = useState<string | null>(null);
  const [newTitle,      setNewTitle]      = useState("");
  const [newSlug,       setNewSlug]       = useState("");
  const [createOpen,    setCreateOpen]    = useState(false);

  function slugify(title: string) {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function deletePage(id: string) {
    setDeleting(true);
    try {
      await api.delete(`/pages/${id}`, accessToken!);
      toast.success("Page deleted");
      mutate();
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function createPage() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<any>("/pages", { title: newTitle.trim(), slug: newSlug.trim(), is_published: false }, accessToken!);
      const id  = res?.data?.id ?? res?.id;
      toast.success("Page created");
      mutate();
      setCreateOpen(false);
      setNewTitle("");
      setNewSlug("");
      if (id) window.location.href = `/pages/${id}`;
    } catch {
      toast.error("Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  async function setupSitePage(sp: SitePageDef) {
    setSettingUp(sp.slug);
    try {
      let token = accessToken!;
      let res: any;
      try {
        res = await api.post<any>("/pages", {
          title: sp.title,
          slug: sp.slug,
          content: sp.defaultHtml,
          meta_description: sp.defaultMeta,
          is_published: false,
        }, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          res = await api.post<any>("/pages", {
            title: sp.title,
            slug: sp.slug,
            content: sp.defaultHtml,
            meta_description: sp.defaultMeta,
            is_published: false,
          }, token);
        } else throw err;
      }
      const id = res?.data?.id ?? res?.id;
      mutate();
      if (id) window.location.href = `/pages/${id}`;
    } catch {
      toast.error("Failed to create page");
    } finally {
      setSettingUp(null);
    }
  }

  const customPages = pages.filter((p) => !SITE_PAGES.some((sp) => sp.slug === p.slug));

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Pages</h1>
          <p className="text-slate-500 text-sm mt-1">Manage marketing site content and create custom pages.</p>
        </div>
        <button onClick={() => setCreateOpen((v) => !v)} className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0">
          <Plus size={13} /> New Page
        </button>
      </div>

      {createOpen && (
        <div className="card p-5 mb-5 border-navy-200 bg-navy-50/30">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">New Custom Page</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input
                className="input-base"
                placeholder="e.g. Privacy Policy"
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); setNewSlug(slugify(e.target.value)); }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Slug <span className="text-slate-400 font-normal">(URL path)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 flex-shrink-0">/</span>
                <input
                  className="input-base"
                  placeholder="privacy-policy"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createPage} disabled={creating || !newTitle.trim() || !newSlug.trim()} className="btn-primary !py-2 !px-5 !text-xs">
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create & Edit
              </button>
              <button onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Marketing Site Pages */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Layout size={13} className="text-slate-400" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Marketing Site Pages</p>
        </div>
        {isLoading ? (
          <div className="card p-6 text-center"><Loader2 size={20} className="animate-spin text-slate-300 mx-auto" /></div>
        ) : (
          <>
            {/* Pages with dedicated React route files */}
            <div className="space-y-2 mb-5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2">Existing pages</p>
              {SITE_PAGES.filter((sp) => !sp.catchAll).map((sp) => {
                const existing = pages.find((p) => p.slug === sp.slug);
                return (
                  <div key={sp.slug} className="card px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy-900 text-sm">{sp.title}</span>
                        {existing ? (
                          existing.is_published ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <Globe size={9} /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              <EyeOff size={9} /> Draft
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                            Not set up
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">/{sp.slug} <span className="font-sans not-italic">·</span> {sp.description}</div>
                    </div>
                    {existing ? (
                      <Link href={`/pages/${existing.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                        <Edit2 size={11} /> Edit
                      </Link>
                    ) : (
                      <button onClick={() => setupSitePage(sp)} disabled={settingUp === sp.slug} className="btn-primary !py-1.5 !px-3 !text-xs flex-shrink-0">
                        {settingUp === sp.slug ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Set Up
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Planned pages — served by /[slug] catch-all */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2">Planned pages <span className="font-normal normal-case tracking-normal">· served by /[slug] catch-all</span></p>
              {SITE_PAGES.filter((sp) => sp.catchAll).map((sp) => {
                const existing = pages.find((p) => p.slug === sp.slug);
                return (
                  <div key={sp.slug} className="card px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy-900 text-sm">{sp.title}</span>
                        {existing ? (
                          existing.is_published ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                              <Globe size={9} /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              <EyeOff size={9} /> Draft
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                            Empty
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">/{sp.slug} <span className="font-sans not-italic">·</span> {sp.description}</div>
                    </div>
                    {existing ? (
                      <Link href={`/pages/${existing.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                        <Edit2 size={11} /> Edit
                      </Link>
                    ) : (
                      <button onClick={() => setupSitePage(sp)} disabled={settingUp === sp.slug} className="btn-primary !py-1.5 !px-3 !text-xs flex-shrink-0">
                        {settingUp === sp.slug ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Set Up
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Custom Pages */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={13} className="text-slate-400" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custom Pages</p>
        </div>

        {isLoading ? (
          <div className="card p-10 text-center">
            <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
          </div>
        ) : error ? (
          <div className="card p-10 text-center">
            <p className="text-red-500 text-sm font-semibold">Failed to load pages.</p>
            <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
          </div>
        ) : customPages.length === 0 ? (
          <div className="card p-10 text-center">
            <FileText size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-semibold">No custom pages yet</p>
            <p className="text-slate-400 text-xs mt-1">Use "New Page" to create a custom CMS page for the catch-all /[slug] route.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customPages.map((page) => (
              <div key={page.id} className="card px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-navy-900 text-sm">{page.title}</span>
                    {page.is_published ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <Globe size={9} /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <EyeOff size={9} /> Draft
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">/{page.slug}</div>
                </div>

                {confirmDelete === page.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-red-600 font-semibold">Delete?</span>
                    <button onClick={() => deletePage(page.id)} disabled={deleting} className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">
                      {deleting ? <Loader2 size={11} className="animate-spin" /> : "Yes"}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">No</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link href={`/pages/${page.id}`} className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </Link>
                    <button onClick={() => setConfirmDelete(page.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
