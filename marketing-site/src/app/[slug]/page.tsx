import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero, { type PageHeroProps } from "@/components/sections/PageHero";

type CMSPage = PageHeroProps & {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_description: string;
  is_published: boolean;
  hero_enabled: boolean;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getPage(slug: string): Promise<CMSPage | null> {
  try {
    const res = await fetch(`${API}/pages/public/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? json) as CMSPage;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Not Found" };
  return {
    title: page.title,
    description: page.meta_description || undefined,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <>
      <Navbar />
      {page.hero_enabled ? (
        <PageHero {...page} />
      ) : (
        <div className="container-md" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <h1 className="text-4xl font-display font-black text-ink-900 mb-10">{page.title}</h1>
        </div>
      )}
      <main className="pb-20 bg-white">
        <div className="container-md">
          {page.content ? (
            <div
              className="prose prose-slate max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : (
            <p className="text-slate-400 text-sm">This page has no content yet.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
