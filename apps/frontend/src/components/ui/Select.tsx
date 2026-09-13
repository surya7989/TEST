import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  onChange?: (value: string) => void;
  value?: string;
  'aria-label'?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, options, placeholder, onChange, value,...props }, ref) => {
    return (<select
        ref={ref}
        className={cn('input cursor-pointer appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7C8C%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-11',
          className)}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(option => (<option key={option.value} value={option.value}>
            {option.label}
          </option>))}
      </select>);
  });

Select.displayName = 'Select';