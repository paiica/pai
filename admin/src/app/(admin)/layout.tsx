"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { useAuthStore } from "@/store/auth.store";
import { type AdminTabKey } from "@/components/layout/AdminSidebar";

// Map each admin route prefix → tab key
const ROUTE_TAB_MAP: Array<{ prefix: string; tab: AdminTabKey }> = [
  { prefix: "/applications",  tab: "applications"   },
  { prefix: "/assignments",   tab: "assignments"    },
  { prefix: "/exam-sessions", tab: "exam_sessions"  },
  { prefix: "/users",         tab: "users"          },
  { prefix: "/blog",          tab: "blog"           },
  { prefix: "/pages",         tab: "pages"          },
  { prefix: "/online-tools",  tab: "online_tools"   },
  { prefix: "/affiliates",    tab: "sales"          },
  { prefix: "/commissions",   tab: "sales"          },
  { prefix: "/promo-codes",   tab: "sales"          },
  { prefix: "/payments",      tab: "payments"       },
  { prefix: "/courses",       tab: "prep_courses"   },
  { prefix: "/certifications",tab: "certificates"   },
  { prefix: "/certificates",  tab: "certificates"   },
  { prefix: "/design",        tab: "design"         },
  { prefix: "/settings",      tab: "settings"       },
];

function getTabForPath(pathname: string): AdminTabKey | null {
  for (const { prefix, tab } of ROUTE_TAB_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return tab;
  }
  return null;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, _hasHydrated, fetchMe, user } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!accessToken) { router.replace("/login"); return; }
    fetchMe();
  }, [_hasHydrated, accessToken, router, fetchMe]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin" && user.role !== "super_admin") {
      router.replace("/dashboard");
      return;
    }

    // Tab-level access guard for non-super-admins
    if (user.role === "admin") {
      const tabForPath = getTabForPath(pathname);
      if (tabForPath) {
        const allowed = user.admin_tabs ?? [];
        if (!allowed.includes(tabForPath)) {
          router.replace("/dashboard");
        }
      }
    }
  }, [user, router, pathname]);

  if (!_hasHydrated || !accessToken) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && user.role !== "admin" && user.role !== "super_admin") {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        <div className="h-9 bg-navy-900 border-b border-navy-700/50 flex items-center justify-end px-5 flex-shrink-0">
          <a
            href="https://webmail.public.paii.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-medium text-gold-400 hover:text-gold-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Webmail
          </a>
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
