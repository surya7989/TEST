import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, hint, id,...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (<div className="w-full">
        {label && <label htmlFor={inputId} className="label">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={cn('w-full rounded-xl border bg-surface px-4 py-3.5 text-body text-text-primary placeholder:text-text-muted transition-all duration-200',
            'hover:border-neutral-400 focus:border-focus focus:ring-2 focus:ring-focus/20 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-error focus:border-error focus:ring-error/20',
            className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (<p id={`${inputId}-error`} className="mt-1.5 text-body-sm text-error" role="alert">
            {error}
          </p>)}
        {hint && !error && (<p id={`${inputId}-hint`} className="mt-1.5 text-body-sm text-text-muted">
            {hint}
          </p>)}
      </div>);
  });

Input.displayName = 'Input';