import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, description, id,...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (<div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn('h-4 w-4 rounded border border-border bg-surface',
              'checked:bg-primary checked:border-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200',
              className)}
            {...props}
          />
          {props.checked && (<Check className="h-3 w-3 text-white" aria-hidden="true" />)}
        </div>
        {(label || description) && (<div className="min-w-0">
            {label && (<label htmlFor={checkboxId} className="font-medium text-text-primary cursor-pointer select-none">
                {label}
              </label>)}
            {description && (<p className="text-body-sm text-text-muted mt-0.5">{description}</p>)}
          </div>)}
      </div>);
  });

Checkbox.displayName = 'Checkbox';