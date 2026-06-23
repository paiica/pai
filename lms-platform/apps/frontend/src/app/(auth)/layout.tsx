import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 justify-center">
            <img src="/paii.logo.png" alt="Professional AI Institute" className="h-10 w-auto object-contain" />
            <span className="text-sm font-semibold text-slate-700 leading-tight text-left">Professional AI<br />Institute</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
