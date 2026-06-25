import StudentSidebar from "@/components/layout/StudentSidebar";
import StudentTopBar from "@/components/layout/StudentTopBar";
import AuthGuard from "@/components/layout/AuthGuard";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <StudentSidebar />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <StudentTopBar />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
