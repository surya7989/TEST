import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = 'primary', size = 'md', children,...props }, ref) => {
    const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-medium';
    const variantClasses = {
      primary: 'bg-primary/10 text-primary-700',
      secondary: 'bg-secondary/10 text-secondary-700',
      accent: 'bg-accent/10 text-accent-700',
      success: 'bg-success-light text-success',
      warning: 'bg-warning-light text-warning',
      error: 'bg-error-light text-error',
      outline: 'border border-border text-text-secondary',
    };
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-caption',
      md: 'px-3 py-1 text-body-sm',
    };

    return (<span
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {children}
      </span>);
  });

Badge.displayName = 'Badge';