"use client";

import { useEffect, useState } from "react";
import { useCustomer } from "@/context/CustomerContext";
import { TESTIMONIALS, avatarUrl } from "@/components/home/homeData";
import { AvisReviewData } from "@/components/avis/AvisReviewCard";
import { AvisHero } from "@/components/avis/AvisHero";
import { AvisMarquee } from "@/components/avis/AvisMarquee";
import { AvisForm } from "@/components/avis/AvisForm";
import { AvisCta } from "@/components/avis/AvisCta";

type ApiReview = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date: string;
};

const FALLBACK: AvisReviewData[] = TESTIMONIALS.map((t, i) => ({
  id: `fallback-${i}`,
  authorName: t.name,
  city: t.city,
  rating: t.rating,
  text: t.quote,
  avatarUrl: avatarUrl(t.name, t.avatarParams),
}));

export function Reviews() {
  const { customer, isAuthenticated } = useCustomer();
  const [reviews, setReviews] = useState<AvisReviewData[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/reviews", { cache: "no-store" });
        if (!isMounted) return;
        if (res.ok) {
          const data = (await res.json()) as ApiReview[];
          if (Array.isArray(data) && data.length > 0) {
            setReviews(
              data.map((r) => ({
                id: r.id,
                authorName: r.authorName,
                rating: r.rating,
                text: r.text,
                avatarUrl: avatarUrl(r.authorName, ""),
              }))
            );
            return;
          }
        }
        setReviews(FALLBACK);
      } catch {
        setReviews(FALLBACK);
      }
    };

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  const addReview = async (rating: number, authorName: string, text: string) => {
    const optimistic: AvisReviewData = {
      id: String(Date.now()),
      authorName,
      rating,
      text,
      avatarUrl: avatarUrl(authorName, ""),
    };
    setReviews((r) => [optimistic, ...r]);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, rating, text, date: new Date().toISOString().slice(0, 10) }),
      });
    } catch (err) {
      console.error("Failed to send review to API:", err);
    }
  };

  const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 5;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    percent: reviews.length > 0 ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  return (
    <div>
      <AvisHero avgRating={avgRating} totalCount={reviews.length} distribution={distribution} featured={reviews[0] ?? null} />
      <AvisMarquee reviews={reviews} />
      <AvisForm
        isAuthenticated={isAuthenticated}
        defaultFirstName={customer ? `${customer.first_name} ${customer.last_name.charAt(0)}.` : undefined}
        defaultCity={customer?.city}
        onSubmit={addReview}
      />
      <AvisCta />
    </div>
  );
}
