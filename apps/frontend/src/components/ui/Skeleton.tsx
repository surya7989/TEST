import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({ className, variant = 'text', width, height, animation = 'pulse',...props }, ref) => {
    const baseClasses = 'bg-neutral-200 overflow-hidden';
    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-[shimmer_1.5s_infinite]',
      none: '',
    };
    const variantClasses = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-xl',
      card: 'rounded-2xl',
    };

    return (<div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
        style={{ width, height }}
        {...props}
      />);
  });

Skeleton.displayName = 'Skeleton';

export const SkeletonText = ({ lines = 3, className,...props }: { lines?: number; className?: string } & Omit<SkeletonProps, 'variant'>) => (<div className={cn('space-y-3', className)} {...props}>
    {Array.from({ length: lines }).map((_, i) => (<Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />))}
  </div>);

export const SkeletonCard = ({ className,...props }: { className?: string } & Omit<SkeletonProps, 'variant'>) => (<Skeleton variant="card" className={cn('p-6 space-y-4', className)} {...props}>
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="30%" />
      </div>
    </div>
    <Skeleton variant="rectangular" width="100%" height={200} />
    <div className="flex items-center gap-3">
      <Skeleton variant="text" width="80px" />
      <Skeleton variant="text" width="60px" />
    </div>
  </Skeleton>);

export const SkeletonProductCard = ({ className,...props }: { className?: string } & Omit<SkeletonProps, 'variant'>) => (<Skeleton variant="card" className={cn('p-0 overflow-hidden', className)} {...props}>
    <Skeleton variant="rectangular" width="100%" height={200} />
    <div className="p-4 space-y-3">
      <Skeleton variant="text" width="60px" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="100px" />
    </div>
  </Skeleton>);