import { useEffect, useState } from 'react';
import { TESTIMONIALS } from '@/components/home/homeData';
import { averageRating } from '@/lib/rating';

// Même source que la page Avis (Reviews.tsx) : les avis de l'API s'il y en a, sinon ceux affichés sur l'accueil
const FALLBACK_AVERAGE = averageRating(TESTIMONIALS.map((testimonial) => testimonial.rating));

export function useSiteRating(): number {
  const [average, setAverage] = useState(FALLBACK_AVERAGE);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const ratings = data
          .map((review) => Number((review as { rating?: unknown }).rating))
          .filter((rating) => Number.isFinite(rating));
        if (ratings.length > 0) setAverage(averageRating(ratings));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return average;
}
