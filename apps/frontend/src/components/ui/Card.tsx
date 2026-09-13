import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, variant = 'default', padding = 'md', children,...props }, ref) => {
    const baseClasses = 'rounded-2xl transition-all duration-350 ease-out-circ';
    const variantClasses = {
      default: 'bg-surface border border-border shadow-card hover:shadow-card-hover',
      interactive: 'bg-surface border border-border shadow-card hover:shadow-card-hover cursor-pointer',
      outlined: 'bg-transparent border-2 border-border hover:border-primary/50',
    };
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (<div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>);
  });

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className,...props }, ref) => (<div ref={ref} className={cn('mb-4', className)} {...props} />));

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ className,...props }, ref) => (<h3 ref={ref} className={cn('heading-5', className)} {...props} />));

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(({ className,...props }, ref) => (<p ref={ref} className={cn('text-body text-text-secondary mt-1', className)} {...props} />));

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className,...props }, ref) => (<div ref={ref} className={cn('', className)} {...props} />));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className,...props }, ref) => (<div ref={ref} className={cn('mt-4 pt-4 border-t border-border flex items-center gap-3', className)} {...props} />));

CardFooter.displayName = 'CardFooter';