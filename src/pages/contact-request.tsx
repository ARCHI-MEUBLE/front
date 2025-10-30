import { useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ContactRequestPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.message) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('company', formData.company || '');
      formDataToSend.append('subject', formData.subject || 'Demande de contact');
      formDataToSend.append('message', formData.message);

      const response = await fetch('https://formspree.io/f/xkgpvjke', {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          subject: '',
          message: '',
        });

        // Rediriger après 2 secondes
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        throw new Error('Erreur lors de l\'envoi du formulaire');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du formulaire. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Faire une demande — ArchiMeuble</title>
        <meta name="description" content="Contactez ArchiMeuble pour vos projets de meubles sur mesure" />
      </Head>
      <Header />
      <main className="flex-1">
        <div className="min-h-screen bg-alabaster">
          {/* Hero Section */}
          <section className="w-full bg-gradient-to-b from-white/80 to-alabaster py-20">
            <div className="mx-auto max-w-5xl px-6">
              <p className="text-sm font-medium uppercase tracking-wider text-ink/60">Nous contacter</p>
              <h1 className="heading-serif mt-4 text-5xl text-ink">Envoyez-nous votre demande</h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
                Décrivez votre projet et nos experts ArchiMeuble vous recontacteront rapidement pour discuter de vos besoins.
              </p>
            </div>
          </section>

          {/* Form Section */}
          <section className="mx-auto max-w-3xl px-6 py-20">
            {success ? (
              <div className="rounded-[40px] border border-green-200 bg-green-50/70 p-12 text-center shadow-sm">
                <p className="heading-serif text-2xl text-green-800">Merci pour votre demande !</p>
                <p className="mt-3 text-sm leading-relaxed text-green-700">
                  Nous avons bien reçu votre message. Nos équipes vous recontacteront très bientôt.
                </p>
                <p className="mt-6 text-xs text-green-600">Redirection en cours...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="rounded-[20px] border border-red-200 bg-red-50/70 p-6 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-ink mb-2">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre.email@exemple.com"
                    className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-ink mb-2">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="06 01 02 03 04"
                    className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
                    required
                  />
                </div>

                {/* Company */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-ink mb-2">
                    Entreprise / Projet
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Nom de votre entreprise ou projet (optionnel)"
                    className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-ink mb-2">
                    Sujet de la demande
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="Devis personnalisé">Devis personnalisé</option>
                    <option value="Conseil en aménagement">Conseil en aménagement</option>
                    <option value="Partenariat">Partenariat</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-ink mb-2">
                    Votre message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Décrivez votre projet, vos besoins, vos idées..."
                    rows={6}
                    className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition resize-none"
                    required
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-full bg-ink px-8 py-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Envoi en cours...' : 'Envoyer ma demande'}
                  </button>
                </div>

                {/* Back to home */}
                <div className="pt-4 text-center">
                  <Link href="/" className="text-sm text-ink/70 hover:text-ink transition">
                    ← Retour à l'accueil
                  </Link>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
