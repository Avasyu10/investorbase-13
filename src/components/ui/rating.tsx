
import React from "react";
import { Star } from "lucide-react";

interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
}

export function RatingDisplay({ rating, maxRating = 5 }: RatingDisplayProps) {
  const normalizedRating = Math.min(Math.max(0, rating), maxRating);
  
  return (
    <div className="flex items-center">
      {Array.from({ length: maxRating }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < normalizedRating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {typeof normalizedRating === 'number' 
          ? normalizedRating.toFixed(1) 
          : normalizedRating}
      </span>
    </div>
  );
}
