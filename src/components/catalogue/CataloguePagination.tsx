export function CataloguePagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  return (
    <div className="mt-16 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E2D9] bg-white text-[#161513] disabled:opacity-30"
      >
        ←
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`flex h-11 w-11 items-center justify-center rounded-full font-[Geist_Mono] text-[14px] ${
            page === currentPage
              ? "border border-[#161513] bg-[#D4FF3A] text-[#161513]"
              : "border border-[#E5E2D9] bg-white text-[#161513]"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E2D9] bg-white text-[#161513] disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}
