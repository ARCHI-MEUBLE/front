"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
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
    // Charger les avis depuis l'API, avec fallback local si l'API n'est pas disponible
    const fallback: Review[] = [
      {
        id: "1",
        authorName: "Marine D.",
        rating: 5,
        text: "Très bonne expérience, le meuble correspondait exactement à ce que j'attendais.",
        date: "2025-10-10"
      },
      {
        id: "2",
        authorName: "Paul L.",
        rating: 4,
        text: "Livraison rapide et service client réactif.",
        date: "2025-09-20"
      }
    ];

    let isMounted = true;

    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/reviews", { cache: 'no-store' });
        if (!isMounted) return;
        if (res.ok) {
          const data = (await res.json()) as Review[];
          setReviews(Array.isArray(data) ? data : fallback);
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
          setSessionUser({ name: data.user?.name || data.user?.email || "" });
        } else {
          setSessionUser(null);
        }
      } catch (e) {
        setSessionUser(null);
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    };

    fetchReviews();
    fetchSession();

    // Polling session toutes les 5s pour détecter logout
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

    // optimistic update
    setReviews((r) => [newReview, ...r]);

    // try to send to API — if fails we keep optimistic locally but log error
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

  return (
    <div className="w-full bg-gradient-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Avis de nos clients
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Découvrez ce que nos clients pensent de nos meubles sur mesure
          </p>
          
          {/* Stats rapides */}
          {reviews.length > 0 && (
            <div className="mt-8 flex justify-center gap-8">
              <div className="rounded-lg bg-white px-6 py-4 shadow-sm">
                <div className="text-3xl font-bold text-amber-600">{reviews.length}</div>
                <div className="text-sm text-gray-600">Avis clients</div>
              </div>
              <div className="rounded-lg bg-white px-6 py-4 shadow-sm">
                <div className="text-3xl font-bold text-amber-600">
                  {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Note moyenne</div>
              </div>
            </div>
          )}
        </div>

        {/* Review form or login prompt */}

        {loadingSession ? (
          <div className="mb-12 text-center text-gray-600">Chargement...</div>
        ) : sessionUser ? (
          showForm ? (
            <div className="mb-12">
              <button
                type="button"
                className="mb-4 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </button>
              <ReviewForm onSubmit={addReview} authorName={sessionUser.name} />
            </div>
          ) : (
            <div className="mb-12 flex justify-center">
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-amber-700 hover:shadow-xl"
                onClick={() => setShowForm(true)}
              >
                Laisser un avis
              </button>
            </div>
          )
        ) : (
          <div className="mb-12 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-amber-50 to-white shadow-md">
            <div className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
                  <User className="h-8 w-8" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-lg font-semibold text-gray-900">Partagez votre expérience</div>
                  <div className="mt-1 text-sm text-gray-600">Connectez-vous pour laisser un avis et des photos</div>
                </div>
              </div>
              <Link 
                href="/login" 
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-amber-700 hover:shadow-xl"
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-sm">
            <p className="text-gray-500">Soyez le premier à laisser un avis !</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
      <div className="p-6">
        {/* Header avec avatar et info */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{review.authorName}</h3>
                <p className="text-sm text-gray-500">{formatDate(review.date)}</p>
              </div>
              {/* Étoiles */}
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-5 w-5 ${
                      i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Texte de l'avis */}
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <p className="text-gray-700 leading-relaxed">{review.text}</p>
        </div>

        {/* Badge vérifié (optionnel) */}
        <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Achat vérifié</span>
        </div>
      </div>
    </article>
  );
}

function formatDate(dateString: string) {
  // Afficher au format JJ-MM-YYYY (style Trustpilot)
  // Accepte des dates au format ISO (YYYY-MM-DD) ou timestamps
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // Si non parsable, essayer si format YYYY-MM-DD simple
    const m = /^\d{4}-\d{2}-\d{2}$/.exec(dateString);
    if (m) {
      const [y, mo, d] = dateString.split('-');
      return `${d}-${mo}-${y}`;
    }
    return dateString; // fallback brut
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function ReviewForm({ onSubmit, authorName }: { onSubmit: (r: number, t: string) => void; authorName?: string }) {
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, text.trim());
      setText("");
      setRating(5);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">Partagez votre expérience</h3>
        <p className="text-sm text-amber-100">Connecté en tant que <strong>{authorName}</strong></p>
      </div>
      
      <div className="p-6 space-y-5">
        {/* Rating interactif */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Votre note</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <svg
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-gray-200 text-gray-200'
                  } transition-colors`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            <span className="ml-2 text-sm font-medium text-gray-600">
              {rating === 5 ? 'Excellent' : rating === 4 ? 'Très bien' : rating === 3 ? 'Bien' : rating === 2 ? 'Moyen' : 'Mauvais'}
            </span>
          </div>
        </div>

        {/* Textarea */}
        <div>
          <label htmlFor="review-text" className="mb-2 block text-sm font-medium text-gray-700">
            Votre avis
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Racontez-nous votre expérience avec nos meubles..."
            className="w-full resize-none rounded-xl border border-gray-300 p-4 text-sm transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <div className="mt-2 text-right text-xs text-gray-500">{text.length} caractères</div>
        </div>

        {/* Bouton submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-amber-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Publication...
              </span>
            ) : (
              'Publier mon avis'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
