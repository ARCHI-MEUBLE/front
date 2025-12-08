import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Mail, Calendar, Phone, Video, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CalendlyWidget } from '@/components/CalendlyWidget';

export default function ContactRequestPage() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [activeTab, setActiveTab] = useState<"contact" | "appointment">("contact");
    const [appointmentType, setAppointmentType] = useState<"phone" | "visio">("phone");

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

    // Récupération des URLs Calendly depuis le backend
    const [phoneUrl, setPhoneUrl] = useState("");
    const [visioUrl, setVisioUrl] = useState("");

    useEffect(() => {
        // Charger la configuration depuis le backend
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/config');
                if (res.ok) {
                    const data = await res.json();
                    setPhoneUrl(data.calendly?.phoneUrl || "");
                    setVisioUrl(data.calendly?.visioUrl || "");
                }
            } catch (err) {
                console.error('Erreur lors du chargement de la configuration:', err);
            }
        };
        fetchConfig();
    }, []);

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
                <div className="min-h-screen bg-surface">
                    {/* Hero Section */}
                    <section className="w-full bg-gradient-to-b from-white/80 to-alabaster py-20">
                        <div className="mx-auto max-w-5xl px-6">
                            <p className="text-sm font-medium uppercase tracking-wider text-ink/60">Nous contacter</p>
                            <h1 className="font-serif mt-4 text-5xl text-ink">Contactez ArchiMeuble</h1>
                            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone">
                                Envoyez-nous un message ou prenez rendez-vous pour une consultation gratuite.
                            </p>

                            {/* Navigation par tabs */}
                            <div className="mt-10 flex justify-center gap-4">
                                <button
                                    onClick={() => setActiveTab("contact")}
                                    className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
                                        activeTab === "contact"
                                            ? "bg-ink text-white shadow-lg"
                                            : "border border-ink/20 text-ink hover:border-ink/40"
                                    }`}
                                >
                                    <Mail className="h-4 w-4" />
                                    Nous écrire
                                </button>
                                <button
                                    onClick={() => setActiveTab("appointment")}
                                    className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition-all duration-300 ${
                                        activeTab === "appointment"
                                            ? "bg-ink text-white shadow-lg"
                                            : "border border-ink/20 text-ink hover:border-ink/40"
                                    }`}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Prendre RDV
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Form Section - Tab "Nous écrire" */}
                    {activeTab === "contact" && (
                        <section className="mx-auto max-w-3xl px-6 py-20">
                            {success ? (
                                <div className="rounded-[40px] border border-green-200 bg-green-50/70 p-12 text-center shadow-sm">
                                    <p className="font-serif text-2xl text-green-800">Merci pour votre demande !</p>
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
                                            className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
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
                                            className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
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
                                            className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
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
                                            className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition"
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
                                            className="w-full rounded-[12px] border border-[#e0d7cc] bg-white px-4 py-3 text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20 transition resize-none"
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
                                        <Link href="/" className="text-sm text-stone hover:text-ink transition">
                                            ← Retour à l'accueil
                                        </Link>
                                    </div>
                                </form>
                            )}
                        </section>
                    )}

                    {/* Tab "Prendre RDV" - Layout 2 colonnes */}
                    {activeTab === "appointment" && (
                        <section className="mx-auto max-w-6xl px-6 py-20">
                            <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:items-start">
                                {/* COLONNE GAUCHE : Informations */}
                                <div className="rounded-sm border border-[#e0d7cc] bg-white/80 p-10 shadow-xl">
                                    <h2 className="font-serif text-3xl leading-tight text-ink">
                                        Réservez votre consultation gratuite
                                    </h2>
                                    <p className="mt-6 text-base leading-relaxed text-stone">
                                        Discutons ensemble de votre projet de meuble sur mesure. Nous prenons le temps de comprendre vos
                                        besoins pour vous proposer une solution parfaitement adaptée.
                                    </p>

                                    {/* Bénéfices de la consultation */}
                                    <div className="mt-10 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-ink" />
                                            <div>
                                                <p className="font-semibold text-ink">Analyse de votre espace</p>
                                                <p className="mt-1 text-sm text-ink/60">Étude détaillée de vos contraintes et possibilités</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-ink" />
                                            <div>
                                                <p className="font-semibold text-ink">Définition de vos besoins</p>
                                                <p className="mt-1 text-sm text-ink/60">Échange approfondi sur vos attentes et vos envies</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-ink" />
                                            <div>
                                                <p className="font-semibold text-ink">Devis personnalisé gratuit</p>
                                                <p className="mt-1 text-sm text-ink/60">Estimation précise basée sur votre projet</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sélecteur de type de rendez-vous */}
                                    <div className="mt-10">
                                        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
                                            Type de consultation
                                        </p>
                                        <div className="space-y-3">
                                            <button
                                                type="button"
                                                onClick={() => setAppointmentType("phone")}
                                                className={`flex w-full items-center gap-4 rounded-[20px] border p-4 text-left transition-all duration-300 ${
                                                    appointmentType === "phone"
                                                        ? "border-ink bg-ink/5 shadow-lg"
                                                        : "border-[#e0d7cc] hover:border-ink/40"
                                                }`}
                                            >
                                                <Phone className="h-6 w-6 text-ink" />
                                                <div>
                                                    <p className="font-semibold text-ink">Appel téléphonique</p>
                                                    <p className="text-sm text-stone">30 minutes · Simple et rapide</p>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAppointmentType("visio")}
                                                className={`flex w-full items-center gap-4 rounded-[20px] border p-4 text-left transition-all duration-300 ${
                                                    appointmentType === "visio"
                                                        ? "border-ink bg-ink/5 shadow-lg"
                                                        : "border-[#e0d7cc] hover:border-ink/40"
                                                }`}
                                            >
                                                <Video className="h-6 w-6 text-ink" />
                                                <div>
                                                    <p className="font-semibold text-ink">Visioconférence</p>
                                                    <p className="text-sm text-stone">45 minutes · Analyse détaillée</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* COLONNE DROITE : Widget Calendly */}
                                <div>
                                    {(phoneUrl || visioUrl) ? (
                                         <CalendlyWidget url={appointmentType === "phone" ? phoneUrl : visioUrl} />
                                    ) : (
                                        <div className="rounded-sm border border-[#e0d7cc] bg-white/80 p-10 text-center text-stone">
                                            <p>Configuration Calendly manquante. Veuillez configurer les variables d'environnement.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}