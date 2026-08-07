import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PRESENTATIONS, getPresentation } from "../data";

export function generateStaticParams() {
  return PRESENTATIONS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) return { title: "Not Found" };
  return {
    title: presentation.title,
    description: presentation.description,
  };
}

export default async function PresentationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const presentation = getPresentation(slug);
  if (!presentation) notFound();

  return (
    <div className="fixed inset-0 bg-ink-900">
      <Link
        href="/presentations"
        className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 text-ink-900 text-xs font-semibold shadow hover:bg-white transition-colors"
      >
        <ArrowLeft size={13} /> All Presentations
      </Link>
      <iframe
        src={`/presentations/${presentation.file}`}
        title={presentation.title}
        className="w-full h-full border-0"
      />
    </div>
  );
}
