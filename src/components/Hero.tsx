import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-alabaster">
      <div className="mx-auto flex min-h-[420px] max-w-6xl flex-col items-start justify-center px-6 py-24 text-left">
        <p className="text-xs font-medium uppercase tracking-[0.4em] text-ink/40">Collection 2025</p>
        <h1 className="heading-serif mt-6 max-w-3xl text-4xl leading-tight text-ink md:text-[48px]">
          Configurez votre meuble idéal en quelques clics
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/70">
          Composez un meuble unique à partir de nos gabarits inspirés des projets clients : dimensions, finitions, options de
          rangements… chaque détail se personnalise.
        </p>
        <Link href="#templates" className="mt-10 button-elevated">
          Découvrir nos modèles
        </Link>
      </div>
    </section>
  );
}
