import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function MentionsLegales() {
  return (
    <>
      <Head>
        <title>Mentions Légales - ArchiMeuble</title>
        <meta name="description" content="Mentions légales du site ArchiMeuble - Meubles sur mesure à Lille" />
      </Head>

      <Header />

      <main className="min-h-screen bg-[#FAFAF9]">
        {/* Header */}
        <div className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <h1 className="font-serif text-3xl tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              Mentions Légales
            </h1>
            <p className="mt-4 text-[#706F6C]">
              Dernière mise à jour : Décembre 2024
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="space-y-12">
            {/* Éditeur du site */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Éditeur du site
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  <strong className="text-[#1A1917]">ArchiMeuble</strong>
                </p>
                <p>
                  30 Rue Henri Regnault<br />
                  59000 Lille, France
                </p>
                <p>
                  <strong className="text-[#1A1917]">Téléphone :</strong>{' '}
                  <Link href="tel:+33601062867" className="hover:text-[#8B7355]">
                    06 01 06 28 67
                  </Link>
                </p>
                <p>
                  <strong className="text-[#1A1917]">Email :</strong>{' '}
                  <Link href="mailto:pro.archimeuble@gmail.com" className="hover:text-[#8B7355]">
                    pro.archimeuble@gmail.com
                  </Link>
                </p>
                <p>
                  <strong className="text-[#1A1917]">SIRET :</strong> 123 456 789 00012
                </p>
                <p>
                  <strong className="text-[#1A1917]">N° TVA intracommunautaire :</strong> FR 12 123456789
                </p>
              </div>
            </section>

            {/* Directeur de la publication */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Directeur de la publication
              </h2>
              <p className="mt-6 text-[#706F6C]">
                Le directeur de la publication est le représentant légal de la société ArchiMeuble.
              </p>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Hébergement
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Ce site est hébergé par :<br />
                  <strong className="text-[#1A1917]">Vercel Inc.</strong><br />
                  440 N Barranca Ave #4133<br />
                  Covina, CA 91723, États-Unis
                </p>
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Propriété intellectuelle
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes, icônes, etc.)
                  est la propriété exclusive d'ArchiMeuble ou de ses partenaires et est protégé par les lois
                  françaises et internationales relatives à la propriété intellectuelle.
                </p>
                <p>
                  Toute reproduction, représentation, modification, publication, adaptation de tout ou partie
                  des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf
                  autorisation écrite préalable d'ArchiMeuble.
                </p>
              </div>
            </section>

            {/* Protection des données */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Protection des données personnelles
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Conformément à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée et au
                  Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès,
                  de rectification, de suppression et d'opposition aux données personnelles vous concernant.
                </p>
                <p>
                  Pour exercer ces droits, vous pouvez nous contacter par email à{' '}
                  <Link href="mailto:pro.archimeuble@gmail.com" className="text-[#1A1917] underline hover:text-[#8B7355]">
                    pro.archimeuble@gmail.com
                  </Link>{' '}
                  ou par courrier à l'adresse mentionnée ci-dessus.
                </p>
                <p>
                  Pour plus d'informations, consultez notre{' '}
                  <Link href="/confidentialite" className="text-[#1A1917] underline hover:text-[#8B7355]">
                    Politique de Confidentialité
                  </Link>.
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Cookies
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Ce site utilise des cookies pour améliorer votre expérience de navigation, réaliser des
                  statistiques de visites et vous proposer des contenus adaptés. Vous pouvez configurer
                  vos préférences de cookies à tout moment via les paramètres de votre navigateur.
                </p>
              </div>
            </section>

            {/* Limitation de responsabilité */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Limitation de responsabilité
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  ArchiMeuble s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées
                  sur ce site. Toutefois, ArchiMeuble ne peut garantir l'exactitude, la précision ou
                  l'exhaustivité des informations mises à disposition sur ce site.
                </p>
                <p>
                  ArchiMeuble décline toute responsabilité pour toute imprécision, inexactitude ou omission
                  portant sur des informations disponibles sur ce site, ainsi que pour tout dommage résultant
                  d'une intrusion frauduleuse d'un tiers.
                </p>
              </div>
            </section>

            {/* Droit applicable */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Droit applicable
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Les présentes mentions légales sont régies par le droit français. En cas de litige,
                  les tribunaux français seront seuls compétents.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-[#E8E6E3] pt-12">
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Nous contacter
              </h2>
              <p className="mt-6 text-[#706F6C]">
                Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter :
              </p>
              <div className="mt-6">
                <Link
                  href="/contact-request"
                  className="inline-flex h-12 items-center justify-center bg-[#1A1917] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28]"
                >
                  Nous contacter
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
