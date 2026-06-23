import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VerifyForm from "./VerifyForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <>
      <Navbar />
      <main>
        <section className="pt-[148px] pb-24 bg-hero-dark relative overflow-hidden">
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">Certificate Verification</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              Verify a PAI Credential
            </h1>
            <p className="text-lg text-white max-w-xl mx-auto">
              Enter a certificate ID to verify its authenticity and check its validity status.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full">
              <path d="M0 60L1440 60V30C1440 30 1080 0 720 0C360 0 0 30 0 30V60Z" fill="white" />
            </svg>
          </div>
        </section>

        <section className="section-padding bg-white">
          <div className="max-w-xl mx-auto px-4">
            <VerifyForm initialId={id || ""} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
