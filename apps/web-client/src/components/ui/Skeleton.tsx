import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'text', width, height, count = 1 }) => {
  const base = 'animate-pulse rounded-md bg-muted';
  const variants = {
    text: 'h-4 w-full',
    circular: 'h-10 w-10 rounded-full',
    rectangular: 'h-20 w-full',
    card: 'h-32 w-full rounded-xl',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(base, variants[variant], className)} style={{ width, height }} />
      ))}
    </>
  );
};

export default Skeleton;