import { Seo } from "@/components/Seo";
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Confidentialite() {
  return (
    <>
      <Seo title="Politique de confidentialité — ArchiMeuble" description="Comment ArchiMeuble collecte, utilise et protège vos données personnelles." />

      <Header />

      <main className="min-h-screen bg-am-paper">
        {/* Header */}
        <div className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <h1 className="text-heading text-black">
              Politique de Confidentialité
            </h1>
            <p className="mt-4 text-black/65">
              Dernière mise à jour : novembre 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="space-y-12">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl text-black">
                Introduction
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  ArchiMeuble s&apos;engage à protéger la vie privée des utilisateurs de son site internet.
                  Cette politique de confidentialité explique comment nous collectons, utilisons et
                  protégeons vos données personnelles.
                </p>
                <p>
                  <strong className="text-black">Responsable du traitement :</strong><br />
                  ArchiMeuble<br />
                  30 Rue Henri Regnault, 59000 Lille, France<br />
                  Email : <Link href="mailto:pro.archimeuble@gmail.com" className="hover:text-am-navy">pro.archimeuble@gmail.com</Link>
                </p>
              </div>
            </section>

            {/* Données collectées */}
            <section>
              <h2 className="text-2xl text-black">
                Données collectées
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>Nous collectons les données suivantes :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-black">Données d&apos;identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
                  <li><strong className="text-black">Données de livraison :</strong> adresse postale</li>
                  <li><strong className="text-black">Données de commande :</strong> historique des commandes, configurations de meubles</li>
                  <li><strong className="text-black">Demandes de devis et de contact :</strong> votre message et les photos ou plans que vous joignez</li>
                  <li><strong className="text-black">Avis :</strong> le nom et le texte que vous publiez, visibles par tous les visiteurs</li>
                  <li><strong className="text-black">Données techniques :</strong> adresse IP, utilisée seulement pour limiter les abus (essais de connexion, envois répétés de formulaires)</li>
                  <li><strong className="text-black">Données de paiement :</strong> traitées directement par notre prestataire Stripe ; nous ne voyons jamais votre numéro de carte</li>
                </ul>
              </div>
            </section>

            {/* Finalités */}
            <section>
              <h2 className="text-2xl text-black">
                Finalités du traitement
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>Vos données sont utilisées pour :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Traiter et suivre vos commandes</li>
                  <li>Confirmer votre adresse email par un code à usage unique (aucun compte ni mot de passe)</li>
                  <li>Vous contacter concernant vos projets de meubles sur mesure</li>
                  <li>Protéger le site contre les abus (tentatives de connexion répétées, envois automatisés)</li>
                  <li>Améliorer nos services et notre site internet</li>
                  <li>Respecter nos obligations légales et réglementaires</li>
                  <li>Vous envoyer des communications commerciales (avec votre consentement)</li>
                </ul>
              </div>
            </section>

            {/* Base légale */}
            <section>
              <h2 className="text-2xl text-black">
                Base légale du traitement
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>Le traitement de vos données repose sur :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-black">L&apos;exécution d&apos;un contrat :</strong> traitement de vos commandes</li>
                  <li><strong className="text-black">Votre consentement :</strong> envoi de newsletters et communications commerciales</li>
                  <li><strong className="text-black">L&apos;intérêt légitime :</strong> amélioration de nos services, prévention de la fraude et des abus</li>
                  <li><strong className="text-black">Les obligations légales :</strong> conservation des factures</li>
                </ul>
              </div>
            </section>

            {/* Conservation */}
            <section>
              <h2 className="text-2xl text-black">
                Durée de conservation
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>Vos données sont conservées pendant :</p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-black">Demandes de devis et de contact</strong> (fichiers joints compris) : 3 ans après le dernier échange</li>
                  <li><strong className="text-black">Rendez-vous :</strong> 3 ans après la date du rendez-vous</li>
                  <li><strong className="text-black">Comptes clients sans commande :</strong> 3 ans après la dernière modification du compte</li>
                  <li><strong className="text-black">Clients ayant commandé et factures :</strong> 10 ans après la commande (obligation comptable)</li>
                  <li><strong className="text-black">Avis publiés :</strong> jusqu&apos;à ce que vous en demandiez la suppression</li>
                  <li><strong className="text-black">Adresses IP</strong> utilisées contre les abus : 30 jours</li>
                  <li><strong className="text-black">Codes de vérification et liens de réinitialisation :</strong> supprimés dès leur expiration</li>
                  <li><strong className="text-black">Modèles 3D de la réalité augmentée</strong> (sans donnée personnelle) : 30 jours</li>
                </ul>
                <p>
                  Ces suppressions sont faites automatiquement chaque jour ; les sauvegardes de notre base de données,
                  gardées 30 jours, en conservent une copie jusqu&apos;à leur remplacement. Vous pouvez aussi demander la
                  suppression de vos données à tout moment (voir « Vos droits »).
                </p>
              </div>
            </section>

            {/* Partage */}
            <section>
              <h2 className="text-2xl text-black">
                Partage des données
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Vos données peuvent être partagées avec :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-black">Vercel</strong> : hébergement du site</li>
                  <li><strong className="text-black">Railway</strong> : hébergement de nos serveurs et de notre base de données</li>
                  <li><strong className="text-black">Stripe</strong> : paiement en ligne</li>
                  <li><strong className="text-black">Resend</strong> : envoi des e-mails (confirmations, codes de vérification)</li>
                  <li><strong className="text-black">Calendly</strong> : prise de rendez-vous en ligne, seulement si vous l&apos;utilisez</li>
                  <li>Nos prestataires de livraison</li>
                  <li>Les autorités compétentes si requis par la loi</li>
                </ul>
                <p>
                  Ces prestataires sont des sociétés américaines : vos données peuvent être transférées hors de l&apos;Union
                  européenne. Ces transferts sont encadrés par les garanties prévues par le RGPD (Data Privacy Framework
                  UE–États-Unis ou clauses contractuelles types de la Commission européenne).
                </p>
                <p>
                  Les photos et polices du site sont servies par nos propres serveurs : votre navigateur ne contacte aucun
                  autre service tant que vous n&apos;utilisez pas le paiement ou la prise de rendez-vous.
                </p>
                <p>
                  Nous ne vendons jamais vos données personnelles à des tiers.
                </p>
              </div>
            </section>

            {/* Droits */}
            <section>
              <h2 className="text-2xl text-black">
                Vos droits
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-black">Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
                  <li><strong className="text-black">Droit de rectification :</strong> corriger vos données inexactes</li>
                  <li><strong className="text-black">Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
                  <li><strong className="text-black">Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                  <li><strong className="text-black">Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
                  <li><strong className="text-black">Droit de limitation :</strong> limiter le traitement de vos données</li>
                </ul>
                <p>
                  Pour exercer vos droits, contactez-nous à{' '}
                  <Link href="mailto:pro.archimeuble@gmail.com" className="text-black underline hover:text-am-navy">
                    pro.archimeuble@gmail.com
                  </Link>.
                </p>
              </div>
            </section>

            {/* Sécurité */}
            <section>
              <h2 className="text-2xl text-black">
                Sécurité des données
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
                  protéger vos données contre tout accès non autorisé, modification, divulgation ou
                  destruction. Ces mesures incluent :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li>Chiffrement SSL/TLS des communications</li>
                  <li>Confirmation de l&apos;adresse email par un code à usage unique, limité dans le temps et en nombre d&apos;essais</li>
                  <li>Accès limité aux données par notre personnel</li>
                  <li>Sauvegardes régulières et sécurisées</li>
                </ul>
              </div>
            </section>

            {/* Cookies */}
            <section id="cookies">
              <h2 className="text-2xl text-black">
                Cookies
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Notre site n&apos;utilise ni cookie de mesure d&apos;audience, ni cookie publicitaire. Il n&apos;utilise que
                  ce qui est nécessaire à son fonctionnement, qui ne demande pas votre consentement :
                </p>
                <ul className="ml-6 list-disc space-y-2">
                  <li><strong className="text-black">Cookie de session</strong> (ARCHIMEUBLE_SESSID) : votre connexion et votre panier, supprimé à la fermeture du navigateur</li>
                  <li><strong className="text-black">Stockage local du navigateur :</strong> le meuble en cours dans le configurateur, le panier d&apos;échantillons et vos préférences d&apos;affichage. Ces informations restent sur votre appareil.</li>
                  <li><strong className="text-black">Stripe</strong>, sur les pages de paiement seulement : cookies de prévention de la fraude, indispensables au paiement</li>
                </ul>
                <p>
                  Le calendrier de prise de rendez-vous (Calendly) dépose ses propres cookies : il ne se charge qu&apos;après
                  votre accord, donné en cliquant sur « Afficher le calendrier ». Cet accord est retenu 6 mois ; pour le
                  retirer, effacez les données de ce site dans votre navigateur.
                </p>
              </div>
            </section>

            {/* Réclamation */}
            <section>
              <h2 className="text-2xl text-black">
                Réclamation
              </h2>
              <div className="mt-6 space-y-4 text-black/65">
                <p>
                  Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation
                  à la Commission Nationale de l&apos;Informatique et des Libertés (CNIL) :
                </p>
                <p>
                  CNIL<br />
                  3 Place de Fontenoy<br />
                  TSA 80715<br />
                  75334 Paris Cedex 07<br />
                  <Link href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-black underline hover:text-am-navy">
                    www.cnil.fr
                  </Link>
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-black/10 pt-12">
              <h2 className="text-2xl text-black">
                Nous contacter
              </h2>
              <p className="mt-6 text-black/65">
                Pour toute question relative à cette politique de confidentialité :
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
