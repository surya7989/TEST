import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', size = 'md', loading, fullWidth, disabled, children,...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-250 ease-out-expo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary',
      secondary: 'bg-secondary text-white hover:bg-secondary-700 active:bg-secondary-800 focus-visible:ring-secondary',
      accent: 'bg-accent text-white hover:bg-accent-600 active:bg-accent-700 focus-visible:ring-accent',
      outline: 'border-2 border-primary text-primary hover:bg-primary/5 active:bg-primary/10 focus-visible:ring-primary',
      ghost: 'text-text-primary hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-neutral-400',
      destructive: 'bg-error text-white hover:bg-error-700 active:bg-error-800 focus-visible:ring-error',
    };

    const sizeClasses = {
      sm: 'px-4 py-2.5 text-body-sm',
      md: 'px-6 py-3.5 text-body',
      lg: 'px-8 py-4 text-body-lg',
      icon: 'p-3',
    };

    return (<button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>)}
        {children}
      </button>);
  });

Button.displayName = 'Button';