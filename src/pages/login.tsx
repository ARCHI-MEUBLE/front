import Head from "next/head";
import type { GetServerSideProps } from "next";
import { LoginForm } from "@/components/LoginForm";
import { parseSessionFromCookieHeader } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <Head>
        <title>Connexion | ArchiMeuble</title>
      </Head>
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-4xl rounded-[40px] border border-[#e0d7cc] bg-white/80 p-12 shadow-xl backdrop-blur">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="hidden flex-col justify-center rounded-sm bg-surface/80 p-8 md:flex">
              <h2 className="font-serif text-3xl text-ink">Votre espace ArchiMeuble</h2>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                Accédez à vos meubles sauvegardés, suivez vos projets et personnalisez vos configurations en toute
                simplicité.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-ink/80">
                <li className="rounded-sm bg-white/60 px-4 py-3 shadow-sm">Sauvegarde illimitée de vos meubles configurés</li>
                <li className="rounded-sm bg-white/60 px-4 py-3 shadow-sm">Suivi des commandes en temps réel</li>
                <li className="rounded-sm bg-white/60 px-4 py-3 shadow-sm">Accès rapide à l&apos;assistance personnalisée</li>
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <LoginForm />
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
