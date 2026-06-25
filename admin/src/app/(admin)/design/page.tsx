import Link from "next/link";
import { LayoutTemplate, Navigation, PlusCircle, Mail } from "lucide-react";

const SECTIONS = [
  {
    href: "/design/blocks",
    icon: LayoutTemplate,
    color: "bg-purple-50 text-purple-600",
    title: "Page Blocks",
    desc: "Show, hide, reorder and edit content for each section of the marketing homepage.",
  },
  {
    href: "/design/navigation",
    icon: Navigation,
    color: "bg-blue-50 text-blue-600",
    title: "Navigation Menu",
    desc: "Add, remove, and reorder header menu items visible on the marketing site.",
  },
  {
    href: "/design/certifications/new",
    icon: PlusCircle,
    color: "bg-emerald-50 text-emerald-600",
    title: "New Certification",
    desc: "Create a new certification program and add it to the catalog.",
  },
  {
    href: "/design/email-templates",
    icon: Mail,
    color: "bg-rose-50 text-rose-600",
    title: "Email Templates",
    desc: "Customise subject lines and enable or disable each transactional email.",
  },
];

export default function DesignHubPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-gold-600 mb-1">Admin</div>
        <h1 className="text-2xl font-display font-black text-navy-900">Design & Content</h1>
        <p className="text-slate-500 text-sm mt-1">Manage what visitors see on the public website — no code required.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, color, title, desc }) => (
          <Link key={href} href={href} className="card p-6 hover:shadow-md transition-shadow group">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
              <Icon size={22} />
            </div>
            <h2 className="font-display font-bold text-navy-900 mb-1 group-hover:text-navy-700">{title}</h2>
            <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
