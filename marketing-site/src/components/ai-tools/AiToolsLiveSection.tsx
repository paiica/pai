import { getLocale, getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type AiTool = { id: string; name: string; category: string; description: string; website_url: string; logo_url: string; pricing_summary: string };

// Same pattern as GlossaryLiveSection — server-rendered, fetches its own
// content, renders nothing until PAII publishes at least one real tool
// listing (the collection starts empty by design, not seeded).
export default async function AiToolsLiveSection({ cmsContent }: { cmsContent: { badge?: string; title?: string } }) {
  const locale = await getLocale();
  const t = await getTranslations("AiTools");
  let tools: AiTool[] = [];
  try {
    const res = await fetch(`${API}/ai-tools/public?lang=${locale}`, { next: { revalidate: 120 } });
    if (res.ok) {
      const json = await res.json();
      tools = json.data ?? json ?? [];
    }
  } catch {
    tools = [];
  }

  if (!tools.length) return null;

  const byCategory = new Map<string, AiTool[]>();
  for (const tool of tools) {
    if (!byCategory.has(tool.category)) byCategory.set(tool.category, []);
    byCategory.get(tool.category)!.push(tool);
  }

  return (
    <div className="container-md py-4">
      {(cmsContent?.badge || cmsContent?.title) && (
        <div className="text-center mb-8">
          {cmsContent.badge?.trim() && <span className="badge-teal mb-4 justify-center">{cmsContent.badge}</span>}
          {cmsContent.title?.trim() && <h2 className="section-title">{cmsContent.title}</h2>}
        </div>
      )}
      <div className="space-y-10">
        {Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-sm font-display font-black text-ink-900 mb-4 pb-2 border-b border-sand-200">{category}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((tool) => (
                <div key={tool.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-display font-bold text-ink-900 text-sm">{tool.name}</p>
                    {tool.website_url && (
                      <a href={tool.website_url} target="_blank" rel="noopener noreferrer" aria-label={t("visitWebsite", { name: tool.name })} className="text-slate-400 hover:text-teal-600 flex-shrink-0">
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">{tool.description}</p>
                  {tool.pricing_summary && <p className="text-[11px] font-semibold text-teal-700">{tool.pricing_summary}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
