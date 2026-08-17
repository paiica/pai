import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-sand-100 flex items-center justify-center pt-20">
        <div className="text-center px-4">
          <div className="text-8xl font-display font-black text-ink-900 mb-4">404</div>
          <h1 className="text-3xl font-display font-black text-ink-900 mb-3">Page Not Found</h1>
          <p className="text-ink-900 mb-8 max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/" className="btn-primary !py-3.5 !px-8">
            Back to Homepage <ArrowRight size={14} />
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
