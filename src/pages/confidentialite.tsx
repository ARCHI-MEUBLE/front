import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Confidentialite() {
  return (
    <>
      <Head>
        <title>Politique de Confidentialité - ArchiMeuble</title>
        <meta name="description" content="Politique de confidentialité du site ArchiMeuble - Protection de vos données personnelles" />
      </Head>

      <Header />

      <main className="min-h-screen bg-[#FAFAF9]">
        {/* Header */}
        <div className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <h1 className="font-serif text-3xl tracking-[-0.02em] text-[#1A1917] sm:text-4xl lg:text-5xl">
              Politique de Confidentialité
            </h1>
            <p className="mt-4 text-[#706F6C]">
              Dernière mise à jour : Décembre 2024
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="space-y-12">
            {/* Introduction */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Introduction
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  ArchiMeuble s'engage à protéger la vie privée des utilisateurs de son site internet.
                  Cette politique de confidentialité explique comment nous collectons, utilisons et
                  protégeons vos données personnelles.
                </p>
                <p>
                  <strong className="text-[#1A1917]">Responsable du traitement :</strong><br />
                  ArchiMeuble<br />
                  30 Rue Henri Regnault, 59000 Lille, France<br />
                  Email : <Link href="mailto:pro.archimeuble@gmail.com" className="hover:text-[#8B7355]">pro.archimeuble@gmail.com</Link>
                </p>
              </div>
            </section>

            {/* Données collectées */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Données collectées
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>Nous collectons les données suivantes :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-[#1A1917]">Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                  <li><strong className="text-[#1A1917]">Données de livraison :</strong> adresse postale</li>
                  <li><strong className="text-[#1A1917]">Données de commande :</strong> historique des commandes, configurations de meubles</li>
                  <li><strong className="text-[#1A1917]">Données de connexion :</strong> adresse IP, données de navigation</li>
                  <li><strong className="text-[#1A1917]">Données de paiement :</strong> traitées de manière sécurisée par notre prestataire Stripe</li>
                </ul>
              </div>
            </section>

            {/* Finalités */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Finalités du traitement
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>Vos données sont utilisées pour :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Traiter et suivre vos commandes</li>
                  <li>Gérer votre compte client</li>
                  <li>Vous contacter concernant vos projets de meubles sur mesure</li>
                  <li>Améliorer nos services et notre site internet</li>
                  <li>Respecter nos obligations légales et réglementaires</li>
                  <li>Vous envoyer des communications commerciales (avec votre consentement)</li>
                </ul>
              </div>
            </section>

            {/* Base légale */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Base légale du traitement
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>Le traitement de vos données repose sur :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-[#1A1917]">L'exécution d'un contrat :</strong> traitement de vos commandes</li>
                  <li><strong className="text-[#1A1917]">Votre consentement :</strong> envoi de newsletters et communications commerciales</li>
                  <li><strong className="text-[#1A1917]">L'intérêt légitime :</strong> amélioration de nos services, prévention de la fraude</li>
                  <li><strong className="text-[#1A1917]">Les obligations légales :</strong> conservation des factures</li>
                </ul>
              </div>
            </section>

            {/* Conservation */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Durée de conservation
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>Vos données sont conservées pendant :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-[#1A1917]">Données clients :</strong> 3 ans après la dernière commande</li>
                  <li><strong className="text-[#1A1917]">Données de facturation :</strong> 10 ans (obligation légale)</li>
                  <li><strong className="text-[#1A1917]">Données de prospection :</strong> 3 ans après le dernier contact</li>
                  <li><strong className="text-[#1A1917]">Cookies :</strong> 13 mois maximum</li>
                </ul>
              </div>
            </section>

            {/* Partage */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Partage des données
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Vos données peuvent être partagées avec :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Nos prestataires de paiement (Stripe)</li>
                  <li>Nos prestataires de livraison</li>
                  <li>Nos prestataires d'hébergement (Vercel)</li>
                  <li>Les autorités compétentes si requis par la loi</li>
                </ul>
                <p>
                  Nous ne vendons jamais vos données personnelles à des tiers.
                </p>
              </div>
            </section>

            {/* Droits */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Vos droits
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-[#1A1917]">Droit d'accès :</strong> obtenir une copie de vos données</li>
                  <li><strong className="text-[#1A1917]">Droit de rectification :</strong> corriger vos données inexactes</li>
                  <li><strong className="text-[#1A1917]">Droit à l'effacement :</strong> demander la suppression de vos données</li>
                  <li><strong className="text-[#1A1917]">Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                  <li><strong className="text-[#1A1917]">Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                  <li><strong className="text-[#1A1917]">Droit de limitation :</strong> limiter le traitement de vos données</li>
                </ul>
                <p>
                  Pour exercer vos droits, contactez-nous à{' '}
                  <Link href="mailto:pro.archimeuble@gmail.com" className="text-[#1A1917] underline hover:text-[#8B7355]">
                    pro.archimeuble@gmail.com
                  </Link>.
                </p>
              </div>
            </section>

            {/* Sécurité */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Sécurité des données
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
                  protéger vos données contre tout accès non autorisé, modification, divulgation ou
                  destruction. Ces mesures incluent :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Chiffrement SSL/TLS des communications</li>
                  <li>Authentification sécurisée des comptes utilisateurs</li>
                  <li>Accès limité aux données par notre personnel</li>
                  <li>Sauvegardes régulières et sécurisées</li>
                </ul>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Cookies
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Notre site utilise des cookies pour :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-[#1A1917]">Cookies essentiels :</strong> fonctionnement du site, panier d'achat</li>
                  <li><strong className="text-[#1A1917]">Cookies analytiques :</strong> analyse de l'utilisation du site</li>
                  <li><strong className="text-[#1A1917]">Cookies de préférence :</strong> mémorisation de vos choix</li>
                </ul>
                <p>
                  Vous pouvez configurer vos préférences de cookies dans les paramètres de votre navigateur.
                </p>
              </div>
            </section>

            {/* Réclamation */}
            <section>
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Réclamation
              </h2>
              <div className="mt-6 space-y-4 text-[#706F6C]">
                <p>
                  Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation
                  à la Commission Nationale de l'Informatique et des Libertés (CNIL) :
                </p>
                <p>
                  CNIL<br />
                  3 Place de Fontenoy<br />
                  TSA 80715<br />
                  75334 Paris Cedex 07<br />
                  <Link href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#1A1917] underline hover:text-[#8B7355]">
                    www.cnil.fr
                  </Link>
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-[#E8E6E3] pt-12">
              <h2 className="font-serif text-2xl text-[#1A1917]">
                Nous contacter
              </h2>
              <p className="mt-6 text-[#706F6C]">
                Pour toute question relative à cette politique de confidentialité :
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
