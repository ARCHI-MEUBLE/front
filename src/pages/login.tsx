import Head from "next/head";
import type { GetServerSideProps } from "next";
import { LoginForm } from "@/components/LoginForm";
import { parseSessionFromCookieHeader } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Connexion | ArchiMeuble</title>
      </Head>

      {/* Back link */}
      <div className="px-5 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#6B6560] transition-colors hover:text-[#1A1917]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
            {/* Left - Info */}
            <div className="hidden flex-col justify-center lg:flex">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                Espace client
              </span>
              <h1 className="mt-4 font-serif text-3xl text-[#1A1917] lg:text-4xl">
                Votre espace
                <br />
                <span className="text-[#6B6560]">ArchiMeuble</span>
              </h1>
              <p className="mt-6 leading-relaxed text-[#6B6560]">
                Accédez à vos meubles sauvegardés, suivez vos projets et personnalisez
                vos configurations en toute simplicité.
              </p>

              {/* Features */}
              <div className="mt-10 space-y-4">
                {[
                  "Sauvegarde illimitée de vos meubles configurés",
                  "Suivi des commandes en temps réel",
                  "Accès rapide à l'assistance personnalisée"
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-l-2 border-[#E8E4DE] bg-white py-4 pl-5 pr-6"
                  >
                    <span className="text-sm text-[#1A1917]">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Trust */}
              <div className="mt-10 flex items-center gap-3">
                <div className="flex gap-0.5">
                  <div className="h-4 w-1.5 bg-[#0055A4]" />
                  <div className="h-4 w-1.5 bg-[#E8E4DE]" />
                  <div className="h-4 w-1.5 bg-[#EF4135]" />
                </div>
                <span className="text-sm text-[#6B6560]">
                  Fabrication artisanale française
                </span>
              </div>
            </div>

            {/* Right - Form */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md bg-white p-6 sm:p-8 lg:p-10">
                {/* Mobile header */}
                <div className="mb-8 text-center lg:hidden">
                  <h1 className="font-serif text-2xl text-[#1A1917]">
                    Connexion
                  </h1>
                  <p className="mt-2 text-sm text-[#6B6560]">
                    Accédez à votre espace client
                  </p>
                </div>

                <LoginForm />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = parseSessionFromCookieHeader(context.req.headers.cookie);
  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false
      }
    };
  }

  return {
    props: {}
  };
};
