import StudentSidebar from "@/components/layout/StudentSidebar";
import StudentTopBar from "@/components/layout/StudentTopBar";
import AuthGuard from "@/components/layout/AuthGuard";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <StudentSidebar />
        <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <StudentTopBar />
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
