import { Seo } from "@/components/Seo";
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function MentionsLegales() {
  return (
    <>
      <Seo title="Mentions légales — ArchiMeuble" description="Mentions légales du site ArchiMeuble, menuisier et fabricant de meubles sur mesure à Lille." />

      <Header />

      <main className="min-h-screen bg-am-paper">
        {/* Header */}
        <div className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <h1 className="text-heading text-black">
              Mentions Légales
            </h1>
            <p className="mt-4 text-black/65">
              Dernière mise à jour : Décembre 2024
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="space-y-12">
            {/* Éditeur du site */}
            <section>
              <h2 className="text-2xl text-black">
                Éditeur du site
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  <strong className="text-black">ArchiMeuble</strong>
                </p>
                <p>
                  30 Rue Henri Regnault<br />
                  59000 Lille, France
                </p>
                <p>
                  <strong className="text-black">Téléphone :</strong>{' '}
                  <Link href="tel:+33601062867" className="hover:text-am-navy">
                    06 01 06 28 67
                  </Link>
                </p>
                <p>
                  <strong className="text-black">Email :</strong>{' '}
                  <Link href="mailto:pro.archimeuble@gmail.com" className="hover:text-am-navy">
                    pro.archimeuble@gmail.com
                  </Link>
                </p>
                <p>
                  <strong className="text-black">SIRET :</strong> 8098 4114 1000 25
                </p>
              </div>
            </section>

            {/* Directeur de la publication */}
            <section>
              <h2 className="text-2xl text-black">
                Directeur de la publication
              </h2>
              <p className="mt-6 text-black/65">
                Le directeur de la publication est le représentant légal de la société ArchiMeuble.
              </p>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-2xl text-black">
                Hébergement
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Ce site est hébergé par :<br />
                  <strong className="text-black">Vercel Inc.</strong><br />
                  440 N Barranca Ave #4133<br />
                  Covina, CA 91723, États-Unis
                </p>
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-2xl text-black">
                Propriété intellectuelle
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  L&apos;ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes, icônes, etc.)
                  est la propriété exclusive d&apos;ArchiMeuble ou de ses partenaires et est protégé par les lois
                  françaises et internationales relatives à la propriété intellectuelle.
                </p>
                <p>
                  Toute reproduction, représentation, modification, publication, adaptation de tout ou partie
                  des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf
                  autorisation écrite préalable d&apos;ArchiMeuble.
                </p>
              </div>
            </section>

            {/* Protection des données */}
            <section>
              <h2 className="text-2xl text-black">
                Protection des données personnelles
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Conformément à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée et au
                  Règlement Général sur la Protection des Données (RGPD), vous disposez d&apos;un droit d&apos;accès,
                  de rectification, de suppression et d&apos;opposition aux données personnelles vous concernant.
                </p>
                <p>
                  Pour exercer ces droits, vous pouvez nous contacter par email à{' '}
                  <Link href="mailto:pro.archimeuble@gmail.com" className="text-black underline hover:text-am-navy">
                    pro.archimeuble@gmail.com
                  </Link>{' '}
                  ou par courrier à l&apos;adresse mentionnée ci-dessus.
                </p>
                <p>
                  Pour plus d&apos;informations, consultez notre{' '}
                  <Link href="/confidentialite" className="text-black underline hover:text-am-navy">
                    Politique de Confidentialité
                  </Link>.
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl text-black">
                Cookies
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Ce site utilise des cookies pour améliorer votre expérience de navigation, réaliser des
                  statistiques de visites et vous proposer des contenus adaptés. Vous pouvez configurer
                  vos préférences de cookies à tout moment via les paramètres de votre navigateur.
                </p>
              </div>
            </section>

            {/* Limitation de responsabilité */}
            <section>
              <h2 className="text-2xl text-black">
                Limitation de responsabilité
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  ArchiMeuble s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées
                  sur ce site. Toutefois, ArchiMeuble ne peut garantir l&apos;exactitude, la précision ou
                  l&apos;exhaustivité des informations mises à disposition sur ce site.
                </p>
                <p>
                  ArchiMeuble décline toute responsabilité pour toute imprécision, inexactitude ou omission
                  portant sur des informations disponibles sur ce site, ainsi que pour tout dommage résultant
                  d&apos;une intrusion frauduleuse d&apos;un tiers.
                </p>
              </div>
            </section>

            {/* Droit applicable */}
            <section>
              <h2 className="text-2xl text-black">
                Droit applicable
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Les présentes mentions légales sont régies par le droit français. En cas de litige,
                  les tribunaux français seront seuls compétents.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-black/10 pt-12">
              <h2 className="text-2xl text-black">
                Nous contacter
              </h2>
              <p className="mt-6 text-black/65">
                Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter :
              </p>
              <div className="mt-6">
                <Link
                  href="/contact-request"
                  className="inline-flex h-12 items-center justify-center bg-am-navy px-8 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
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
