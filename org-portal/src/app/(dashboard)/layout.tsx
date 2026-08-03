import OrgSidebar from "@/components/layout/OrgSidebar";
import OrgTopNav from "@/components/layout/OrgTopNav";
import AuthGuard from "@/components/layout/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <OrgSidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <OrgTopNav />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
