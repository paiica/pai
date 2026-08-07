export type Presentation = {
  slug: string;
  title: string;
  file: string;
  audience: string;
  description: string;
};

export const PRESENTATIONS: Presentation[] = [
  {
    slug: "student-guide",
    title: "Student Certification Guide",
    file: "student-guide.html",
    audience: "Prospective Students",
    description:
      "A walkthrough of the PAII certification framework and the CAIP flagship credential — from application, through the student portal and prep courses, to the certification exam and earning your credential.",
  },
  {
    slug: "educator-affiliate-program",
    title: "Affiliate Program for Educators",
    file: "educator-affiliate-program.html",
    audience: "Professors & Educators",
    description:
      "How the Educator Affiliate Program works — the partnership terms, what your students actually receive, and the standards and rigor behind the certification you'd be recommending.",
  },
  {
    slug: "affiliate-portal-walkthrough",
    title: "Affiliate Portal Walkthrough",
    file: "affiliate-portal-walkthrough.html",
    audience: "Affiliates & Sales Reps",
    description:
      "A tour of the affiliate portal — referral links, discount codes, lead tracking, commission history, payouts, marketing materials, and the direct invite system.",
  },
];

export function getPresentation(slug: string): Presentation | undefined {
  return PRESENTATIONS.find((p) => p.slug === slug);
}
