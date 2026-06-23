import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 justify-center">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-display font-black text-white leading-tight">Professional AI</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-gold-400 leading-none">Institute</div>
            </div>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
