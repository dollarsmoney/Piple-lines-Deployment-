import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

export function StarRating({ rating, reviewCount, className }: StarRatingProps) {
  const full = Math.floor(rating);
  const partial = rating - full;
  const empty = 5 - Math.ceil(rating);

  return (
    <span className={cn('flex items-center gap-1', className)}>
      <span className="flex items-center">
        {Array.from({ length: full }, (_, i) => (
          <Star key={`f${i}`} className="size-3.5 fill-amber-400 text-amber-400" />
        ))}
        {partial >= 0.5 && (
          <span className="relative inline-block">
            <Star className="size-3.5 text-muted-foreground/30" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${partial * 100}%` }}>
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
            </span>
          </span>
        )}
        {Array.from({ length: empty }, (_, i) => (
          <Star key={`e${i}`} className="size-3.5 text-muted-foreground/30" />
        ))}
      </span>
      {reviewCount !== undefined && (
        <span className="text-muted-foreground text-xs">({reviewCount.toLocaleString()})</span>
      )}
    </span>
  );
}
