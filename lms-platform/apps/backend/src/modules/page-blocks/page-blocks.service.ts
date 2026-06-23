import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_BLOCKS = [
  {
    key: "hero",
    label: "Hero / Banner",
    sort_order: 1,
    content: {
      slides: [
        {
          image_url: "",
          badge: "The AI Credential Standard",
          headline: "Prove Your AI Expertise.",
          highlight: "Advance Your Career.",
          sub: "PAI offers the most rigorous AI certification programs for professionals, managers, and executives. Join 3,200+ credential holders recognized by leading organizations worldwide.",
          cta_label: "Start with CAIP",
          cta_href: "/certifications/certified-ai-professional",
          cta2_label: "View All Programs",
          cta2_href: "/certifications",
          stat1_value: "3,200+", stat1_label: "Certified Professionals",
          stat2_value: "48",     stat2_label: "Countries",
          stat3_value: "4",      stat3_label: "Programs",
          stat4_value: "94%",    stat4_label: "Employer Recognition",
        },
        {
          image_url: "",
          badge: "Trusted by Professionals Worldwide",
          headline: "Your Industry Needs AI-Verified",
          highlight: "Talent.",
          sub: "From healthcare to finance, technology to education — employers across every sector are requiring verifiable AI credentials. Stand out with a PAI certification that carries real weight.",
          cta_label: "Explore Certifications",
          cta_href: "/certifications",
          cta2_label: "Why PAI?",
          cta2_href: "/about",
          stat1_value: "92%",    stat1_label: "Got Promoted or Hired",
          stat2_value: "38%",    stat2_label: "Average Salary Increase",
          stat3_value: "1,400+", stat3_label: "Hiring Partners",
          stat4_value: "4.9/5",  stat4_label: "Student Rating",
        },
        {
          image_url: "",
          badge: "Enterprise AI Certification",
          headline: "Upskill Your Entire Team.",
          highlight: "All at Once.",
          sub: "PAI Corporate provides tailored certification pathways for organizations. Train your workforce with flexible licensing, cohort learning, and dedicated enterprise support.",
          cta_label: "Get a Corporate Quote",
          cta_href: "/corporate",
          cta2_label: "See Enterprise Plans",
          cta2_href: "/corporate",
          stat1_value: "200+",  stat1_label: "Enterprise Clients",
          stat2_value: "15k+",  stat2_label: "Employees Trained",
          stat3_value: "6 wks", stat3_label: "Avg. Cohort Duration",
          stat4_value: "100%",  stat4_label: "Custom Pathways",
        },
      ],
    },
  },
  {
    key: "certifications",
    label: "Certifications",
    sort_order: 2,
    content: {
      badge: "Certification Programs",
      title: "Become a",
      title_highlight: "certified success",
      description: "No matter what your professional goals are, we have a certification to help you reach them. AI credentials are an excellent way to advance your career.",
      cta_card_title: "Not sure where to start?",
      cta_card_desc: "87% of PAI professionals begin with CAIP — the foundation of all credentials.",
      cta_card_label: "Start with CAIP",
      cta_card_href: "/certifications/certified-ai-professional",
      certs: [
        { acronym: "CAIP",  title: "Certified AI Professional",  slug: "certified-ai-professional",  level: "No experience required",   description: "Master AI fundamentals, tools, workflows, ethics, and practical applications across industries. The essential credential for any professional working with AI.", popular: "true"  },
        { acronym: "CAIM",  title: "Certified AI Manager",       slug: "certified-ai-manager",       level: "2+ years experience",      description: "Lead AI transformation initiatives, manage AI-powered teams, and build data-driven cultures. Designed for managers driving AI adoption.", popular: "false" },
        { acronym: "CAIE",  title: "Certified AI Educator",      slug: "certified-ai-educator",      level: "Educators & trainers",     description: "Design and deliver AI-powered learning experiences. For educators, instructional designers, and L&D professionals.", popular: "false" },
        { acronym: "CAIDA", title: "Certified AI Data Analyst",  slug: "certified-ai-data-analyst",  level: "1+ years data experience", description: "Advanced AI-powered data analysis, machine learning interpretation, and insight-driven decision-making.", popular: "false" },
      ],
    },
  },
  {
    key: "video",
    label: "Featured Video",
    sort_order: 3,
    content: {
      title: "See PAI in Action",
      subtitle: "Discover how PAI certifications are transforming careers and organizations across industries.",
      videos: [{ url: "", label: "" }],
    },
  },
  {
    key: "why_pai",
    label: "Why PAI",
    sort_order: 4,
    content: {
      badge: "Why PAI",
      title: "The Credential That Opens Doors",
      subtitle: "Not another course. A rigorous, globally recognized certification backed by practitioners, validated by employers, and built for the AI era.",
      pillars: [
        { title: "Rigorous & Credible",         description: "Our exams are developed by AI practitioners and reviewed by independent subject-matter experts. ISO 17024-aligned standards ensure your credential means something." },
        { title: "Globally Recognized",          description: "PAI credentials are recognized by employers across 48 countries. Verified via QR code, blockchain-anchored, and LinkedIn-ready in minutes." },
        { title: "Practitioner-Built Curriculum",description: "Every module is authored by active AI professionals — not theorists. Real tools, real workflows, real outcomes. Updated every quarter." },
        { title: "Digital Badges & Certificates",description: "Earn a digital certificate, Open Badge 3.0, and LinkedIn credential. Share and verify instantly with your network and employers." },
        { title: "Career-Defining Impact",       description: "87% of certified professionals report a measurable career advancement within 12 months. Average salary uplift: 18-24% in benchmark studies." },
        { title: "Continuing Education",         description: "AI moves fast. Every certification includes 2-year renewal pathways so your credential stays current with the field." },
        { title: "Global Peer Network",          description: "Join a vetted community of 3,200+ certified AI professionals. Access forums, mentorship, and exclusive events." },
        { title: "Self-Paced Learning",          description: "Complete the program at your own pace on any device. Average completion: 6-10 weeks. No deadlines, no pressure." },
      ],
    },
  },
  {
    key: "testimonials",
    label: "Testimonials",
    sort_order: 5,
    content: {
      badge: "What Professionals Say",
      title: "Trusted by Industry Leaders",
      subtitle: "Join 3,200+ professionals who've advanced their careers with PAI credentials.",
      items: [
        { name: "Sarah Chen",      title: "Senior Product Manager", company: "Shopify",             cert: "CAIP",  avatar: "SC", rating: "5", quote: "CAIP gave me the credibility to lead our AI integration projects. Within 3 months of certifying, I was promoted to lead our AI task force. The curriculum is genuinely rigorous — my team noticed the difference immediately." },
        { name: "Marcus Williams", title: "Director of Operations",  company: "KPMG",               cert: "CAIM",  avatar: "MW", rating: "5", quote: "CAIM is the only certification I've found that addresses the real management challenges of AI adoption — change management, ROI measurement, and building AI-literate teams. Worth every penny." },
        { name: "Priya Patel",     title: "Chief Digital Officer",   company: "Intact Financial",   cert: "CAIE",  avatar: "PP", rating: "5", quote: "As a CDO, I needed a credential that spoke the language of the boardroom. CAIE is exactly that — strategic, governance-focused, and immediately applicable. I completed it in 4 weeks while running a team of 120." },
        { name: "James Okonkwo",   title: "Data Analytics Lead",     company: "Deloitte",           cert: "CAIDA", avatar: "JO", rating: "5", quote: "CAIDA bridges the gap between traditional data analytics and modern AI methods. The curriculum is hands-on, practical, and built by people who actually work with these tools. My team has enrolled 8 people already." },
        { name: "Ana Rodrigues",   title: "HR Director",             company: "Nestlé",             cert: "CAIP",  avatar: "AR", rating: "5", quote: "I came in knowing nothing about AI. CAIP walked me through everything from fundamentals to practical applications for HR. The exam was challenging but fair. Now I'm implementing AI tools across our 40-person HR team." },
        { name: "David Kim",       title: "VP Technology",           company: "Royal Bank of Canada",cert: "CAIM",  avatar: "DK", rating: "5", quote: "The PAI community alone is worth the certification fee. I've connected with AI leaders from 20+ countries. The weekly virtual events and the alumni network are exceptional." },
      ],
    },
  },
  {
    key: "blog",
    label: "Latest Articles",
    sort_order: 6,
    content: {
      badge: "Blog & Insights",
      title: "From the Blog",
    },
  },
  {
    key: "cta",
    label: "Call to Action",
    sort_order: 7,
    content: {
      badge: "Limited Cohort Enrollment",
      title: "Your AI Credential Starts Here.",
      highlight: "Applications Open Now.",
      subtitle: "Join professionals from 48 countries who've earned their PAI credential. Each cohort is limited to ensure quality. Apply today to secure your spot.",
      cta_label: "Apply for CAIP — $1,295",
      cta_href: "/certifications/certified-ai-professional",
      cta2_label: "Compare all programs",
      cta2_href: "/certifications",
      trust_1: "30-day money-back guarantee",
      trust_2: "Secure checkout",
      trust_3: "Instant LMS access",
    },
  },
  {
    key: "footer",
    label: "Footer",
    sort_order: 99,
    content: {
      tagline: "The credential standard for AI professionals worldwide.",
      social_linkedin:  "https://linkedin.com/company/professional-ai-institute",
      social_twitter:   "https://x.com/paii_ca",
      social_instagram: "",
      social_email:     "info@paii.ca",
      contact_email: "info@paii.ca",
      contact_location: "Toronto, ON · Canada",
      columns: [
        {
          title: "Certifications",
          links: [
            { label: "Certified AI Professional (CAIP)", href: "/certifications/certified-ai-professional" },
            { label: "Certified AI Manager (CAIM)", href: "/certifications/certified-ai-manager" },
            { label: "Certified AI Executive (CAIE)", href: "/certifications/certified-ai-executive" },
            { label: "Certified AI Data Analyst (CAIDA)", href: "/certifications/certified-ai-data-analyst" },
            { label: "View All Certifications", href: "/certifications" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About PAI", href: "/about" },
            { label: "Our Mission", href: "/about#mission" },
            { label: "Advisory Board", href: "/about#board" },
            { label: "Accreditation", href: "/about#accreditation" },
            { label: "Press & Media", href: "/press" },
            { label: "Careers", href: "/careers" },
          ],
        },
        {
          title: "Resources",
          links: [
            { label: "Blog & Insights", href: "/blog" },
            { label: "AI Glossary", href: "/resources/glossary" },
            { label: "Study Guides", href: "/resources/study-guides" },
            { label: "Verify Certificate", href: "/verify" },
            { label: "FAQs", href: "/faq" },
          ],
        },
        {
          title: "Organizations",
          links: [
            { label: "Corporate Training", href: "/corporate" },
            { label: "Group Enrollment", href: "/corporate#group" },
            { label: "Volume Pricing", href: "/corporate#pricing" },
            { label: "Become a Partner", href: "/partners" },
          ],
        },
      ],
      trust_items: [
        "Globally Recognized Credentials",
        "ISO 17024 Aligned Framework",
        "3,200+ Certified Professionals",
        "30-Day Money-Back Guarantee",
      ],
      copyright: "Professional AI Institute. All rights reserved.",
      bottom_links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "Accessibility", href: "/accessibility" },
      ],
    },
  },
];

@Injectable()
export class PageBlocksService {
  constructor(private prisma: PrismaService) {}

  async getPublic() {
    const blocks = await this.prisma.pageBlock.findMany({ orderBy: { sort_order: "asc" } });
    if (blocks.length === 0) return DEFAULT_BLOCKS.map((b) => ({ ...b, is_visible: true, updated_at: new Date() }));
    return blocks;
  }

  async getAll() {
    const blocks = await this.prisma.pageBlock.findMany({ orderBy: { sort_order: "asc" } });
    if (blocks.length === 0) {
      await this.seed();
      return this.prisma.pageBlock.findMany({ orderBy: { sort_order: "asc" } });
    }
    return blocks;
  }

  async create(key: string, label?: string, sort_order?: number, content?: Record<string, any>) {
    const defaults = DEFAULT_BLOCKS.find((b) => b.key === key);
    return this.prisma.pageBlock.create({
      data: {
        key,
        label:      label      ?? defaults?.label      ?? key,
        sort_order: sort_order ?? defaults?.sort_order ?? 99,
        is_visible: true,
        content:    content    ?? defaults?.content    ?? {},
      },
    });
  }

  async delete(key: string) {
    return this.prisma.pageBlock.delete({ where: { key } });
  }

  async update(key: string, dto: { is_visible?: boolean; content?: Record<string, any>; sort_order?: number; label?: string }) {
    return this.prisma.pageBlock.upsert({
      where: { key },
      update: dto,
      create: {
        key,
        label: dto.label ?? key,
        is_visible: dto.is_visible ?? true,
        content: dto.content ?? {},
        sort_order: dto.sort_order ?? 99,
      },
    });
  }

  async updateMany(updates: Array<{ key: string; sort_order: number; is_visible: boolean }>) {
    const ops = updates.map(({ key, sort_order, is_visible }) =>
      this.prisma.pageBlock.updateMany({ where: { key }, data: { sort_order, is_visible } })
    );
    return this.prisma.$transaction(ops);
  }

  private async seed() {
    const ops = DEFAULT_BLOCKS.map((b) =>
      this.prisma.pageBlock.upsert({
        where: { key: b.key },
        create: { ...b, is_visible: true },
        update: {},
      })
    );
    await this.prisma.$transaction(ops);
  }
}
