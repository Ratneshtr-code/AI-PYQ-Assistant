export default function Pagination({ page, totalMatches, pageSize, onPageChange }) {
  const totalPages = Math.ceil(totalMatches / pageSize);
  if (totalPages <= 1) return null;

  // Smart pagination: show max 10 page numbers
  const getVisiblePages = () => {
    const maxVisible = 10;
    const pages = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is 10 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, page - 2);
      let end = Math.min(totalPages - 1, page + 2);

      // Adjust if we're near the start
      if (page <= 4) {
        end = Math.min(maxVisible - 1, totalPages - 1);
      }
      // Adjust if we're near the end
      if (page >= totalPages - 3) {
        start = Math.max(2, totalPages - maxVisible + 2);
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('...');
      }

      // Add pages around current page
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex justify-center gap-2 mt-6 flex-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        Prev
      </button>

      {visiblePages.map((p, index) => {
        if (p === '...') {
          return (
            <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
              ...
            </span>
          );
        }
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 border rounded transition-colors ${
              p === page
                ? "bg-blue-600 text-white border-blue-600"
                : "hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
