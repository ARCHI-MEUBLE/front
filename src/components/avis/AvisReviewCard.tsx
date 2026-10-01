export type AvisReviewData = {
  id: string;
  authorName: string;
  city?: string;
  rating: number;
  text: string;
  avatarUrl: string;
};

export function AvisReviewCard({ review }: { review: AvisReviewData }) {
  return (
    <figure className="m-0 flex flex-col gap-[18px] rounded-[14px] border border-[#E5E2D9] bg-white p-6">
      <span role="img" aria-label={`${review.rating} étoiles sur 5`} className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="flex h-[22px] w-[22px] items-center justify-center text-[14px] leading-none"
            style={{ background: i < review.rating ? "#00B67A" : "#DCDCE6", color: "#FFFFFF" }}
          >
            ★
          </span>
        ))}
      </span>
      <blockquote className="m-0 text-[17px] leading-[1.55] text-[#161513]">{review.text}</blockquote>
      <figcaption className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={review.avatarUrl}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="block h-11 w-11 flex-none rounded-full border border-[#E5E2D9] bg-[#EDEBE4]"
        />
        <span>
          <span className="block text-[15px] font-medium text-[#161513]">{review.authorName}</span>
          {review.city && (
            <span className="block font-[Geist_Mono] text-[11px] uppercase tracking-[0.04em] text-[#5F5B53]">
              {review.city}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
