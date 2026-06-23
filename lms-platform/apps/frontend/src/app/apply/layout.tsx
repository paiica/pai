import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-display font-black text-navy-900 leading-none">PAI Portal</div>
            <div className="text-[9px] text-gold-600 uppercase tracking-widest">Apply for Certification</div>
          </div>
        </Link>
      </header>
      <main className="py-10 px-4">{children}</main>
    </div>
  );
}
