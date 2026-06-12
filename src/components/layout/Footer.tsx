import Link from "next/link";
import Image from "next/image";
import { Award, Mail, MapPin, Phone, Linkedin, Twitter, Youtube } from "lucide-react";

const FOOTER_LINKS = {
  Certifications: [
    { label: "Certified AI Professional (CAIP)", href: "/certifications/certified-ai-professional" },
    { label: "Certified AI Manager (Coming Soon)", href: "/certifications" },
    { label: "Certified AI Educator (Coming Soon)", href: "/certifications" },
    { label: "Certified AI Data Analyst (Coming Soon)", href: "/certifications" },
    { label: "All Certifications", href: "/certifications" },
  ],
  "Resources & Learning": [
    { label: "AI Foundations (Free)", href: "/ai-foundations" },
    { label: "Learning Path", href: "/learning-path" },
    { label: "My Learning", href: "/learn" },
    { label: "Corporate Training", href: "/corporate" },
    { label: "Verify a Certificate", href: "/verify" },
  ],
  Organization: [
    { label: "About PAI", href: "/about" },
    { label: "Our Mission", href: "/about#mission" },
    { label: "Advisory Board", href: "/about#advisory-board" },
    { label: "Employer Recognition", href: "/#employer-recognition" },
    { label: "Contact Us", href: "/corporate#contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Certification Policy", href: "/certification-policy" },
    { label: "Accessibility", href: "/accessibility" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex mb-6 rounded-xl overflow-hidden bg-white p-2">
              <Image
                src="/logo.png"
                alt="Professional AI Institute"
                width={480}
                height={240}
                className="h-36 w-auto"
              />
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              The leading professional certification body for AI skills. Empowering professionals,
              managers, and organizations with industry-recognized AI credentials.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 text-sm text-slate-400 mb-6">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gold-500 flex-shrink-0" />
                <a href="mailto:info@professionalaiinstitute.com" className="hover:text-gold-400 transition-colors">
                  info@professionalaiinstitute.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gold-500 flex-shrink-0" />
                <span>Global — Online Certification Body</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {[
                { Icon: Linkedin, href: "#", label: "LinkedIn" },
                { Icon: Twitter, href: "#", label: "Twitter/X" },
                { Icon: Youtube, href: "#", label: "YouTube" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl bg-navy-800 hover:bg-gold-500 flex items-center justify-center transition-all duration-200 group"
                >
                  <Icon size={15} className="text-slate-400 group-hover:text-navy-900 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-display font-bold text-sm mb-4 uppercase tracking-wider">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-gold-400 text-sm transition-colors leading-relaxed"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Accreditation Banner */}
        <div className="mt-12 p-5 bg-navy-900/50 rounded-2xl border border-navy-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <Award size={20} className="text-gold-500 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-white text-sm font-semibold">
                PAI — A Professional Standards Organization
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                Committed to rigorous certification standards, professional development, and AI ethics.
              </p>
            </div>
          </div>
          <Link
            href="/about"
            className="text-gold-400 hover:text-gold-300 text-xs font-semibold flex-shrink-0 underline underline-offset-2"
          >
            Learn About Our Standards →
          </Link>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} Professional AI Institute. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <Link href="/certification-policy" className="hover:text-slate-300 transition-colors">Certification Policy</Link>
            <Link href="/accessibility" className="hover:text-slate-300 transition-colors">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
