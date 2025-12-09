import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Mail, Calendar, Phone, Video, Check, ArrowRight, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { Footer } from "@/components/Footer";
import { CalendlyWidget } from '@/components/CalendlyWidget';

export default function ContactRequestPage() {
    const router = useRouter();
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

    const [phoneUrl, setPhoneUrl] = useState("");
    const [visioUrl, setVisioUrl] = useState("");

    useEffect(() => {
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

                setTimeout(() => {
                    router.push('/');
                }, 3000);
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
        <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
            <Head>
                <title>Contact — ArchiMeuble</title>
                <meta name="description" content="Contactez ArchiMeuble pour vos projets de meubles sur mesure. Devis gratuit et consultation personnalisée." />
            </Head>
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-[#1A1917] py-20 lg:py-28">
                    {/* Background texture */}
                    <div className="absolute inset-0 opacity-[0.02]">
                        <div className="absolute inset-0" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        }} />
                    </div>

                    <div className="relative mx-auto max-w-7xl px-6">
                        <div className="mx-auto max-w-3xl text-center">
                            <motion.span
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-block text-xs font-medium uppercase tracking-[0.3em] text-[#8B7355]"
                            >
                                Parlons de votre projet
                            </motion.span>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
                            >
                                Comment pouvons-nous
                                <br />
                                <span className="text-[#8B7355]">vous aider ?</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60"
                            >
                                Envoyez-nous un message ou réservez directement
                                un créneau pour une consultation gratuite.
                            </motion.p>

                            {/* Tab Switch */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-10 inline-flex rounded-full border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm"
                            >
                                <button
                                    onClick={() => setActiveTab("contact")}
                                    className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
                                        activeTab === "contact"
                                            ? "bg-white text-[#1A1917]"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    <Mail className="h-4 w-4" />
                                    Nous écrire
                                </button>
                                <button
                                    onClick={() => setActiveTab("appointment")}
                                    className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
                                        activeTab === "appointment"
                                            ? "bg-white text-[#1A1917]"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Prendre RDV
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Content Section */}
                <section className="py-16 lg:py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <AnimatePresence mode="wait">
                            {activeTab === "contact" ? (
                                <motion.div
                                    key="contact"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="grid gap-16 lg:grid-cols-2"
                                >
                                    {/* Left - Contact Info */}
                                    <div>
                                        <h2 className="font-serif text-3xl text-[#1A1917]">
                                            Décrivez votre projet
                                        </h2>
                                        <p className="mt-4 text-[#6B6560]">
                                            Plus vous nous donnez de détails, plus notre réponse
                                            sera précise et adaptée à vos besoins.
                                        </p>

                                        {/* Contact Details */}
                                        <div className="mt-12 space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#F5F3F0]">
                                                    <Phone className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1A1917]">Téléphone</p>
                                                    <a href="tel:+33601062867" className="mt-1 text-[#6B6560] hover:text-[#8B7355]">
                                                        06 01 06 28 67
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#F5F3F0]">
                                                    <Mail className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1A1917]">Email</p>
                                                    <a href="mailto:pro.archimeuble@gmail.com" className="mt-1 text-[#6B6560] hover:text-[#8B7355]">
                                                        pro.archimeuble@gmail.com
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#F5F3F0]">
                                                    <MapPin className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1A1917]">Atelier</p>
                                                    <p className="mt-1 text-[#6B6560]">
                                                        30 Rue Henri Regnault
                                                        <br />
                                                        59000 Lille, France
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#F5F3F0]">
                                                    <Clock className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1A1917]">Disponibilité</p>
                                                    <p className="mt-1 text-[#6B6560]">
                                                        Lun - Ven : 9h - 18h
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trust */}
                                        <div className="mt-12 flex items-center gap-3 border-t border-[#E8E4DE] pt-8">
                                            <div className="flex gap-0.5">
                                                <div className="h-4 w-1.5 rounded-sm bg-[#0055A4]" />
                                                <div className="h-4 w-1.5 rounded-sm bg-[#E8E4DE]" />
                                                <div className="h-4 w-1.5 rounded-sm bg-[#EF4135]" />
                                            </div>
                                            <span className="text-sm text-[#6B6560]">
                                                Fabrication artisanale française
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right - Form */}
                                    <div className="bg-white p-8 lg:p-10">
                                        {success ? (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex flex-col items-center justify-center py-16 text-center"
                                            >
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                                    <Check className="h-8 w-8 text-green-600" />
                                                </div>
                                                <h3 className="mt-6 font-serif text-2xl text-[#1A1917]">
                                                    Message envoyé !
                                                </h3>
                                                <p className="mt-3 text-[#6B6560]">
                                                    Nous vous répondrons dans les plus brefs délais.
                                                </p>
                                                <p className="mt-6 text-sm text-[#8B7355]">
                                                    Redirection automatique...
                                                </p>
                                            </motion.div>
                                        ) : (
                                            <form onSubmit={handleSubmit} className="space-y-6">
                                                {error && (
                                                    <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                                        {error}
                                                    </div>
                                                )}

                                                <div className="grid gap-6 sm:grid-cols-2">
                                                    <div>
                                                        <label htmlFor="name" className="block text-sm font-medium text-[#1A1917]">
                                                            Nom complet *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            id="name"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            placeholder="Jean Dupont"
                                                            className="mt-2 w-full border-b border-[#E8E4DE] bg-transparent py-3 text-[#1A1917] placeholder:text-[#A8A5A0] focus:border-[#1A1917] focus:outline-none transition-colors"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label htmlFor="phone" className="block text-sm font-medium text-[#1A1917]">
                                                            Téléphone *
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            id="phone"
                                                            name="phone"
                                                            value={formData.phone}
                                                            onChange={handleChange}
                                                            placeholder="06 01 02 03 04"
                                                            className="mt-2 w-full border-b border-[#E8E4DE] bg-transparent py-3 text-[#1A1917] placeholder:text-[#A8A5A0] focus:border-[#1A1917] focus:outline-none transition-colors"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label htmlFor="email" className="block text-sm font-medium text-[#1A1917]">
                                                        Email *
                                                    </label>
                                                    <input
                                                        type="email"
                                                        id="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="jean.dupont@email.com"
                                                        className="mt-2 w-full border-b border-[#E8E4DE] bg-transparent py-3 text-[#1A1917] placeholder:text-[#A8A5A0] focus:border-[#1A1917] focus:outline-none transition-colors"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label htmlFor="subject" className="block text-sm font-medium text-[#1A1917]">
                                                        Type de projet
                                                    </label>
                                                    <select
                                                        id="subject"
                                                        name="subject"
                                                        value={formData.subject}
                                                        onChange={handleChange}
                                                        className="mt-2 w-full border-b border-[#E8E4DE] bg-transparent py-3 text-[#1A1917] focus:border-[#1A1917] focus:outline-none transition-colors"
                                                    >
                                                        <option value="">Sélectionnez un type</option>
                                                        <option value="Dressing">Dressing sur mesure</option>
                                                        <option value="Bibliothèque">Bibliothèque</option>
                                                        <option value="Meuble TV">Meuble TV</option>
                                                        <option value="Bureau">Bureau</option>
                                                        <option value="Rangement">Rangement / Placard</option>
                                                        <option value="Autre">Autre projet</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label htmlFor="message" className="block text-sm font-medium text-[#1A1917]">
                                                        Décrivez votre projet *
                                                    </label>
                                                    <textarea
                                                        id="message"
                                                        name="message"
                                                        value={formData.message}
                                                        onChange={handleChange}
                                                        placeholder="Dimensions approximatives, style souhaité, contraintes particulières..."
                                                        rows={5}
                                                        className="mt-2 w-full border-b border-[#E8E4DE] bg-transparent py-3 text-[#1A1917] placeholder:text-[#A8A5A0] focus:border-[#1A1917] focus:outline-none transition-colors resize-none"
                                                        required
                                                    />
                                                </div>

                                                <div className="pt-4">
                                                    <button
                                                        type="submit"
                                                        disabled={isLoading}
                                                        className="flex w-full items-center justify-center gap-2 bg-[#1A1917] px-8 py-4 text-sm font-medium text-white transition-colors hover:bg-[#2D2B28] disabled:opacity-50"
                                                    >
                                                        {isLoading ? (
                                                            <>
                                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                Envoi en cours...
                                                            </>
                                                        ) : (
                                                            <>
                                                                Envoyer ma demande
                                                                <ArrowRight className="h-4 w-4" />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <p className="text-center text-xs text-[#A8A5A0]">
                                                    En soumettant ce formulaire, vous acceptez d'être recontacté
                                                    par notre équipe.
                                                </p>
                                            </form>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="appointment"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="grid gap-12 lg:grid-cols-[400px_1fr]"
                                >
                                    {/* Left - Info */}
                                    <div className="bg-white p-8 lg:p-10">
                                        <h2 className="font-serif text-2xl text-[#1A1917]">
                                            Consultation gratuite
                                        </h2>
                                        <p className="mt-4 text-[#6B6560]">
                                            Échangeons sur votre projet. Nous vous conseillons
                                            sur les meilleures solutions pour votre espace.
                                        </p>

                                        {/* Benefits */}
                                        <div className="mt-8 space-y-4">
                                            {[
                                                "Analyse de votre espace",
                                                "Conseils personnalisés",
                                                "Estimation budgétaire",
                                                "Sans engagement"
                                            ].map((benefit) => (
                                                <div key={benefit} className="flex items-center gap-3">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F5F3F0]">
                                                        <Check className="h-3 w-3 text-[#8B7355]" />
                                                    </div>
                                                    <span className="text-sm text-[#1A1917]">{benefit}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Type selector */}
                                        <div className="mt-10">
                                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#A8A5A0]">
                                                Format
                                            </p>
                                            <div className="mt-4 space-y-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setAppointmentType("phone")}
                                                    className={`flex w-full items-center gap-4 border p-4 text-left transition-all ${
                                                        appointmentType === "phone"
                                                            ? "border-[#1A1917] bg-[#FAFAF9]"
                                                            : "border-[#E8E4DE] hover:border-[#1A1917]/30"
                                                    }`}
                                                >
                                                    <Phone className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                                                    <div>
                                                        <p className="font-medium text-[#1A1917]">Téléphone</p>
                                                        <p className="text-sm text-[#6B6560]">30 min</p>
                                                    </div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAppointmentType("visio")}
                                                    className={`flex w-full items-center gap-4 border p-4 text-left transition-all ${
                                                        appointmentType === "visio"
                                                            ? "border-[#1A1917] bg-[#FAFAF9]"
                                                            : "border-[#E8E4DE] hover:border-[#1A1917]/30"
                                                    }`}
                                                >
                                                    <Video className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                                                    <div>
                                                        <p className="font-medium text-[#1A1917]">Visioconférence</p>
                                                        <p className="text-sm text-[#6B6560]">45 min</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right - Calendly */}
                                    <div className="min-h-[600px] bg-white">
                                        {(phoneUrl || visioUrl) ? (
                                            <CalendlyWidget url={appointmentType === "phone" ? phoneUrl : visioUrl} />
                                        ) : (
                                            <div className="flex h-full items-center justify-center p-10 text-center">
                                                <div>
                                                    <p className="text-[#6B6560]">
                                                        Calendrier de réservation bientôt disponible.
                                                    </p>
                                                    <p className="mt-2 text-sm text-[#A8A5A0]">
                                                        En attendant, contactez-nous par téléphone ou email.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="border-t border-[#E8E4DE] bg-white py-16 lg:py-24">
                    <div className="mx-auto max-w-3xl px-6">
                        <h2 className="text-center font-serif text-3xl text-[#1A1917]">
                            Questions fréquentes
                        </h2>

                        <div className="mt-12 divide-y divide-[#E8E4DE]">
                            {[
                                {
                                    q: "Quel est le délai de fabrication ?",
                                    a: "Comptez 4 à 8 semaines selon la complexité du projet, de la validation du devis à l'installation."
                                },
                                {
                                    q: "Intervenez-vous hors métropole lilloise ?",
                                    a: "Nous intervenons principalement dans les Hauts-de-France. Pour d'autres régions, contactez-nous pour étudier la faisabilité."
                                },
                                {
                                    q: "Le devis est-il gratuit ?",
                                    a: "Oui, le devis et la consultation sont entièrement gratuits et sans engagement."
                                },
                                {
                                    q: "Proposez-vous la pose ?",
                                    a: "Oui, nous assurons la fabrication et la pose de tous nos meubles pour un résultat parfait."
                                },
                            ].map((faq, i) => (
                                <div key={i} className="py-6">
                                    <h3 className="font-medium text-[#1A1917]">{faq.q}</h3>
                                    <p className="mt-2 text-[#6B6560]">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
