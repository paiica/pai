import Link from "next/link";

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6">
        <Link href="/">
          <img src="/paii.logo.png" alt="Professional Artificial Intelligence Institute" className="h-8 w-auto object-contain" />
        </Link>
      </header>
      <main className="py-10 px-4">{children}</main>
    </div>
  );
}
