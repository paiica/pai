"use client";

import { Link } from "@/i18n/navigation";

export type GroupedNavChild = { id: string; label: string; href: string; open_new_tab: boolean; group_label: string };

export function groupChildren(children: GroupedNavChild[]) {
  const order: string[] = [];
  const groups: Record<string, GroupedNavChild[]> = {};
  for (const child of children) {
    const key = child.group_label || "";
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(child);
  }
  return order.map((key) => ({ label: key, children: groups[key] }));
}

// Generic — any top-level nav item whose children carry a group_label
// renders as this multi-column mega-menu instead of the flat single-column
// dropdown. Columns are ordered by each group's first child's sort_order
// (i.e. whatever order they come back in from the API), and an ungrouped
// child (group_label === "") falls into its own unlabeled column.
export default function GroupedMegaMenu({ children, onNavigate }: { children: GroupedNavChild[]; onNavigate?: () => void }) {
  const groups = groupChildren(children);

  // Plain flex row of fixed-width columns (w-52, flex-shrink-0) instead of a
  // CSS Grid with a computed inline width — the grid version's total render
  // width didn't reliably match its own width style (columns spilled past
  // the wrapping card's edge in testing), and a flex row of fixed-width
  // Tailwind-class columns has no arithmetic to get wrong: total width is
  // just the sum of however many w-52 columns actually render.
  return (
    <div className="flex p-5 gap-8">
      {groups.map((g) => (
        <div key={g.label || "_"} className="w-52 flex-shrink-0">
          {g.label && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">{g.label}</p>}
          <div className="space-y-0.5">
            {g.children.map((child) => (
              <Link
                key={child.id}
                href={child.href}
                target={child.open_new_tab ? "_blank" : undefined}
                rel={child.open_new_tab ? "noopener noreferrer" : undefined}
                onClick={onNavigate}
                className="block px-2 py-1.5 -mx-2 rounded-lg text-[13px] font-medium text-ink-900 hover:bg-teal-100 transition-colors leading-snug"
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
