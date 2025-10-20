import Head from "next/head";
import type { GetServerSideProps } from "next";
import { LoginForm } from "@/components/LoginForm";
import { parseSessionFromCookieHeader } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Head>
        <title>Connexion | ArchiMeuble</title>
      </Head>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl rounded-3xl bg-white/80 p-8 shadow-2xl backdrop-blur">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="hidden flex-col justify-center rounded-2xl bg-amber-50 p-8 md:flex">
              <h2 className="text-3xl font-semibold text-amber-900">Votre espace ArchiMeuble</h2>
              <p className="mt-4 text-sm text-amber-800">
                Accédez à vos meubles sauvegardés, suivez vos projets et personnalisez vos configurations en toute simplicité.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-amber-900">
                <li className="rounded-xl bg-white/70 p-3 shadow-sm">Sauvegarde illimitée de vos meubles configurés</li>
                <li className="rounded-xl bg-white/70 p-3 shadow-sm">Suivi des commandes en temps réel</li>
                <li className="rounded-xl bg-white/70 p-3 shadow-sm">Accès rapide à l&apos;assistance personnalisée</li>
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
