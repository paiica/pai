import AffiliateSidebar from "@/components/layout/AffiliateSidebar";
import AffiliateTopNav from "@/components/layout/AffiliateTopNav";
import AuthGuard from "@/components/layout/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <AffiliateSidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <AffiliateTopNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
