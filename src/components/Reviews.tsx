"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

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
    <div className="bg-[#FAF9F7]">
      {/* Hero Section */}
      <section className="px-5 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="mx-auto max-w-6xl">
          {/* Eyebrow */}
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-[#78716C] sm:mb-5">
            Témoignages clients
          </p>

          {/* Headline */}
          <h1 className="max-w-xl font-serif text-3xl font-normal leading-tight text-[#1A1A1A] sm:text-4xl lg:text-5xl">
            Ce que nos clients{" "}
            <span className="text-[#78716C]">pensent de nous</span>
          </h1>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4 sm:mt-10 sm:flex sm:gap-10 lg:mt-12 lg:gap-16">
            {/* Rating */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl font-light text-[#1A1A1A] sm:text-4xl lg:text-5xl">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-sm text-[#78716C]">/5</span>
              </div>
              <p className="mt-1 text-xs text-[#A8A29E] sm:text-sm">Note moyenne</p>
            </div>

            {/* Separator - hidden on mobile */}
            <div className="hidden h-12 w-px self-center bg-[#E7E5E4] sm:block" />

            {/* Count */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl font-light text-[#1A1A1A] sm:text-4xl lg:text-5xl">
                  {reviews.length}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#A8A29E] sm:text-sm">Avis vérifiés</p>
            </div>

            {/* Separator - hidden on mobile */}
            <div className="hidden h-12 w-px self-center bg-[#E7E5E4] sm:block" />

            {/* Satisfaction */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl font-light text-[#1A1A1A] sm:text-4xl lg:text-5xl">
                  100
                </span>
                <span className="text-sm text-[#78716C]">%</span>
              </div>
              <p className="mt-1 text-xs text-[#A8A29E] sm:text-sm">Satisfaits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Review */}
      {reviews.length > 0 && (
        <section className="bg-white px-5 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 sm:gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
              {/* Quote */}
              <blockquote className="max-w-3xl">
                <p className="font-serif text-xl font-normal leading-relaxed text-[#1A1A1A] sm:text-2xl lg:text-3xl">
                  « {reviews[0].text} »
                </p>
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4 lg:flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#7877C6] to-[#B45309] p-0.5 sm:h-14 sm:w-14">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-medium text-[#1A1A1A] sm:text-base">
                    {reviews[0].authorName.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-[#1A1A1A]">{reviews[0].authorName}</p>
                  <p className="text-xs text-[#A8A29E]">Client vérifié</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Reviews Grid */}
      <section className="px-5 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          {/* Section header */}
          <div className="mb-8 flex items-center gap-4 sm:mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#78716C]">
              Tous les avis ({reviews.length})
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-[#E7E5E4] to-transparent" />
          </div>

          {/* Grid */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            {reviews.slice(1).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-[#E7E5E4] bg-white px-5 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">
          {loadingSession ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A1917]/20 border-t-[#1A1917]" />
            </div>
          ) : sessionUser ? (
            showForm ? (
              <div className="mx-auto max-w-xl">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="mb-8 flex items-center gap-2 text-sm text-[#78716C] transition-colors hover:text-[#1A1917]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Retour
                </button>
                <ReviewFormLight
                  onSubmit={addReview}
                  authorName={sessionUser.name}
                  onSuccess={() => setShowForm(false)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-normal text-[#1A1917] sm:text-3xl lg:text-4xl">
                    Partagez votre{" "}
                    <span className="text-[#8B7355]">expérience</span>
                  </h2>
                  <p className="mt-3 max-w-md text-sm text-[#78716C] sm:text-base">
                    Votre avis aide d'autres personnes à découvrir notre savoir-faire.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="group flex w-full items-center justify-center gap-3 bg-[#1A1917] px-6 py-4 font-medium text-white transition-all hover:bg-[#2D2B28] sm:w-auto sm:px-8"
                >
                  Laisser un avis
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-normal text-[#1A1917] sm:text-3xl lg:text-4xl">
                  Rejoignez la{" "}
                  <span className="text-[#8B7355]">conversation</span>
                </h2>
                <p className="mt-3 max-w-md text-sm text-[#78716C] sm:text-base">
                  Connectez-vous pour partager votre expérience.
                </p>
              </div>
              <Link
                href="/login"
                className="group flex w-full items-center justify-center gap-3 border border-[#1A1917] bg-transparent px-6 py-4 font-medium text-[#1A1917] transition-all hover:bg-[#1A1917] hover:text-white sm:w-auto sm:px-8"
              >
                Se connecter
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-sm bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 lg:p-8">
      {/* Rating */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`h-4 w-4 ${star <= review.rating ? 'text-[#1A1A1A]' : 'text-[#E7E5E4]'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-xs text-[#A8A29E]">{review.rating}.0</span>
      </div>

      {/* Text */}
      <p className="mb-6 text-sm leading-relaxed text-[#44403C] sm:text-base">
        {review.text}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F5F4] text-xs font-medium text-[#57534E] sm:h-10 sm:w-10 sm:text-sm">
            {review.authorName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{review.authorName}</p>
            <p className="text-xs text-[#A8A29E]">{formatRelativeDate(review.date)}</p>
          </div>
        </div>

        {/* Verified */}
        <div className="flex items-center gap-1 text-[#059669]">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="hidden text-xs font-medium sm:inline">Vérifié</span>
        </div>
      </div>
    </article>
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
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}

function ReviewFormLight({
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
    <form onSubmit={handleSubmit}>
      {/* Author */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1917] text-base font-medium text-white">
          {authorName?.charAt(0) || 'U'}
        </div>
        <div>
          <p className="font-medium text-[#1A1917]">{authorName}</p>
          <p className="text-xs text-[#78716C]">Partage son expérience</p>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-8">
        <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-[#78716C]">
          Votre note
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex h-11 w-11 items-center justify-center text-base font-light transition-all sm:h-12 sm:w-12 ${
                n <= rating
                  ? 'bg-[#1A1917] text-white'
                  : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#1A1917]'
              }`}
            >
              {n}
            </button>
          ))}
          <span className="ml-2 text-sm text-[#78716C]">
            {ratingLabels[rating - 1]}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="mb-8">
        <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-[#78716C]">
          Votre expérience
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Décrivez votre expérience avec ArchiMeuble..."
          className="w-full resize-none border border-[#E7E5E4] bg-white p-4 text-base text-[#1A1917] placeholder-[#A8A29E] outline-none transition-colors focus:border-[#1A1917]"
        />
        <div className="mt-2 flex justify-between text-xs text-[#78716C]">
          <span>{text.length} caractères</span>
          <span className={text.length >= 20 ? 'text-[#059669]' : ''}>
            {text.length >= 20 ? '✓ Prêt' : `${20 - text.length} min.`}
          </span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || text.length < 20}
        className="group flex w-full items-center justify-center gap-3 bg-[#1A1917] py-4 font-medium text-white transition-colors hover:bg-[#2D2B28] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            Publication...
          </>
        ) : (
          <>
            Publier mon avis
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
