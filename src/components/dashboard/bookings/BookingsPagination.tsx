import { Button } from "@/components/ui/button";

interface BookingsPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function BookingsPagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}: BookingsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="mt-4 flex items-center justify-between px-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          Showing {Math.min(pageSize, totalItems - (currentPage - 1) * pageSize)} of {totalItems} bookings
        </span>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
          }}
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
