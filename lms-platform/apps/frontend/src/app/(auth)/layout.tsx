import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex justify-center">
            <img src="/paii.logo.png" alt="Professional AI Institute" className="h-10 w-auto object-contain" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
