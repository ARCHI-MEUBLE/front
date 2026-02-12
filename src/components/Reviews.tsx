"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Quote, CheckCircle, ArrowRight, ArrowLeft, MessageSquare } from "lucide-react";

type Review = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date: string;
};

export function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sessionUser, setSessionUser] = useState<{ name?: string } | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fallback: Review[] = [
      {
        id: "1",
        authorName: "Marine Dubois",
        rating: 5,
        text: "Un savoir-faire exceptionnel. Mon buffet sur mesure s'intègre parfaitement dans mon intérieur. La qualité du bois et les finitions sont remarquables.",
        date: "2025-10-10"
      },
      {
        id: "2",
        authorName: "Paul Lemaire",
        rating: 5,
        text: "Du premier contact à la livraison, tout était parfait. L'équipe a su comprendre exactement ce que je voulais. Mon bureau est une œuvre d'art fonctionnelle.",
        date: "2025-09-20"
      },
      {
        id: "3",
        authorName: "Sophie Martin",
        rating: 5,
        text: "Enfin des artisans qui prennent le temps d'écouter. Ma bibliothèque épouse parfaitement les courbes de mon salon mansardé.",
        date: "2025-08-15"
      },
      {
        id: "4",
        authorName: "Thomas Bernard",
        rating: 5,
        text: "Qualité irréprochable. Le meuble TV que j'ai commandé est exactement ce que j'imaginais, jusqu'au moindre détail.",
        date: "2025-07-28"
      },
      {
        id: "5",
        authorName: "Claire Fontaine",
        rating: 5,
        text: "Le dressing de mes rêves ! Chaque centimètre a été optimisé. Un travail d'orfèvre que je recommande les yeux fermés.",
        date: "2025-06-12"
      },
      {
        id: "6",
        authorName: "Antoine Mercier",
        rating: 5,
        text: "Rapport qualité-prix imbattable pour du sur-mesure français. La pose a été rapide et soignée. Bravo à toute l'équipe.",
        date: "2025-05-03"
      }
    ];

    let isMounted = true;

    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/reviews", { cache: 'no-store' });
        if (!isMounted) return;
        if (res.ok) {
          const data = (await res.json()) as Review[];
          setReviews(Array.isArray(data) && data.length > 0 ? data : fallback);
        } else {
          setReviews(fallback);
        }
      } catch {
        setReviews(fallback);
      }
    };

    const fetchSession = async () => {
      try {
        const res = await fetch("/api/session", {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          const customerName = data.customer
            ? `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim()
            : data.customer?.email || "";
          setSessionUser({ name: customerName || "Utilisateur" });
        } else {
          setSessionUser(null);
        }
      } catch {
        setSessionUser(null);
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    };

    fetchReviews();
    fetchSession();
    const interval = setInterval(fetchSession, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const addReview = async (rating: number, text: string) => {
    const newReview: Review = {
      id: String(Date.now()),
      authorName: sessionUser?.name || "Utilisateur",
      rating,
      text,
      date: new Date().toISOString().slice(0, 10)
    };
    setReviews((r) => [newReview, ...r]);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview)
      });
    } catch (err) {
      console.error("Failed to send review to API:", err);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length)
    : 5;

  return (
    <div className="bg-[#FAFAF9]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#1A1917] py-20 lg:py-28">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium uppercase tracking-[0.3em] text-[#8B7355]"
              >
                Témoignages
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 font-serif text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                Ce que nos clients
                <br />
                <span className="text-[#8B7355]">disent de nous</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 max-w-md text-lg leading-relaxed text-white/70"
              >
                Découvrez les retours de nos clients sur leur expérience
                avec ArchiMeuble. Chaque avis compte.
              </motion.p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid grid-cols-2 gap-6"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1">
                  <span className="font-serif text-4xl text-white">{avgRating.toFixed(1)}</span>
                  <Star className="h-6 w-6 fill-[#8B7355] text-[#8B7355]" />
                </div>
                <p className="mt-2 text-sm text-white/60">Note moyenne</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
                <span className="font-serif text-4xl text-white">{reviews.length}</span>
                <p className="mt-2 text-sm text-white/60">Avis vérifiés</p>
              </div>

            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Review */}
      {reviews.length > 0 && (
        <section className="border-b border-[#E8E4DE] bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16"
            >
              {/* Quote Icon */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#8B7355]/10 lg:h-24 lg:w-24">
                <Quote className="h-8 w-8 text-[#8B7355] lg:h-12 lg:w-12" />
              </div>

              {/* Quote */}
              <blockquote className="flex-1">
                <p className="font-serif text-2xl leading-relaxed text-[#1A1917] lg:text-3xl">
                  « {reviews[0].text} »
                </p>
                <footer className="mt-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1917] font-medium text-white">
                    {reviews[0].authorName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1917]">{reviews[0].authorName}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${star <= reviews[0].rating ? 'fill-[#8B7355] text-[#8B7355]' : 'text-[#E8E4DE]'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#6B6560]">Client vérifié</span>
                    </div>
                  </div>
                </footer>
              </blockquote>
            </motion.div>
          </div>
        </section>
      )}

      {/* Reviews Grid */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex flex-col items-center text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
              Tous les avis
            </span>
            <h2 className="mt-3 font-serif text-2xl text-[#1A1917] lg:text-3xl">
              {reviews.length} témoignages de confiance
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(1).map((review, i) => (
              <motion.article
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-[#E8E4DE] bg-white p-6 transition-all hover:border-[#1A1917]/20 hover:shadow-lg"
              >
                {/* Rating */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= review.rating ? 'fill-[#8B7355] text-[#8B7355]' : 'text-[#E8E4DE]'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[#059669]">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Vérifié</span>
                  </div>
                </div>

                {/* Text */}
                <p className="mb-6 leading-relaxed text-[#6B6560]">
                  {review.text}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F3F0] text-sm font-medium text-[#1A1917]">
                    {review.authorName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1A1917]">{review.authorName}</p>
                    <p className="text-xs text-[#6B6560]">{formatRelativeDate(review.date)}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6">
          {loadingSession ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
            </div>
          ) : sessionUser ? (
            showForm ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-2xl"
              >
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="mb-8 flex items-center gap-2 text-sm text-[#6B6560] transition-colors hover:text-[#1A1917]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour aux avis
                </button>
                <ReviewForm
                  onSubmit={addReview}
                  authorName={sessionUser.name}
                  onSuccess={() => setShowForm(false)}
                />
              </motion.div>
            ) : (
              <div className="overflow-hidden rounded-3xl bg-[#1A1917]">
                <div className="grid lg:grid-cols-2">
                  <div className="p-10 lg:p-16">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                      Votre avis compte
                    </span>
                    <h2 className="mt-4 font-serif text-3xl text-white lg:text-4xl">
                      Partagez votre
                      <br />expérience
                    </h2>
                    <p className="mt-6 leading-relaxed text-white/70">
                      Votre témoignage aide d'autres personnes à découvrir
                      notre savoir-faire artisanal.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-medium text-[#1A1917] transition-transform hover:scale-105"
                    >
                      Laisser un avis
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative hidden lg:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#8B7355]/20 to-transparent" />
                    <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#8B7355]/10 blur-3xl" />
                    <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-[#8B7355]/20" />
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="overflow-hidden rounded-3xl bg-[#1A1917]">
              <div className="grid lg:grid-cols-2">
                <div className="p-10 lg:p-16">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                    Rejoignez-nous
                  </span>
                  <h2 className="mt-4 font-serif text-3xl text-white lg:text-4xl">
                    Partagez votre
                    <br />expérience
                  </h2>
                  <p className="mt-6 leading-relaxed text-white/70">
                    Connectez-vous pour partager votre avis et aider
                    d'autres clients à découvrir ArchiMeuble.
                  </p>
                  <Link
                    href="/auth/login"
                    className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Se connecter
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="relative hidden lg:block">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8B7355]/20 to-transparent" />
                  <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#8B7355]/10 blur-3xl" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}

function ReviewForm({
  onSubmit,
  authorName,
  onSuccess
}: {
  onSubmit: (r: number, t: string) => void;
  authorName?: string;
  onSuccess?: () => void;
}) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.length < 20) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, text.trim());
      setText("");
      setRating(5);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];

  return (
    <div className="rounded-2xl border border-[#E8E4DE] bg-white p-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1A1917] text-lg font-medium text-white">
          {authorName?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="font-medium text-[#1A1917]">{authorName}</p>
          <p className="text-sm text-[#6B6560]">Partage son expérience</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Rating */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-medium text-[#1A1917]">
            Votre note
          </label>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      n <= (hoverRating || rating)
                        ? 'fill-[#8B7355] text-[#8B7355]'
                        : 'text-[#E8E4DE]'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-[#6B6560]">
              {ratingLabels[(hoverRating || rating) - 1]}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="mb-8">
          <label className="mb-3 block text-sm font-medium text-[#1A1917]">
            Votre expérience
          </label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Décrivez votre expérience avec ArchiMeuble..."
            className="w-full resize-none rounded-xl border border-[#E8E4DE] bg-white p-4 text-[#1A1917] placeholder-[#A8A29E] outline-none transition-colors focus:border-[#1A1917]"
          />
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-[#6B6560]">{text.length} caractères</span>
            <span className={text.length >= 20 ? 'text-[#059669]' : 'text-[#6B6560]'}>
              {text.length >= 20 ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Prêt à publier
                </span>
              ) : (
                `${20 - text.length} caractères minimum`
              )}
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || text.length < 20}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1A1917] py-4 font-medium text-white transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Publication en cours...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              Publier mon avis
            </>
          )}
        </button>
      </form>
    </div>
  );
}
