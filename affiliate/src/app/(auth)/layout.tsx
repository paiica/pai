export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gold-400 rounded-xl flex items-center justify-center shadow-lg shadow-gold-400/30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-display font-black text-white">Affiliate Portal</div>
            <div className="text-[10px] text-gold-400 uppercase tracking-widest">PAI</div>
          </div>
        </div>

        <div className="card shadow-2xl shadow-navy-900/50 p-8">
          {children}
        </div>

        <p className="text-center text-xs text-navy-300 mt-6">
          © {new Date().getFullYear()} Professional AI Institute. All rights reserved.
        </p>
      </div>
    </div>
  );
}
