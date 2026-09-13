import { forwardRef, HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  to?: string;
  path?: string;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  variant?: 'light' | 'dark';
}

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(({ className, items, separator = <ChevronRight className="h-3.5 w-3.5" />, variant = 'light',...props }, ref) => {
    const isDark = variant === 'dark';

    return (<nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center gap-1.5 flex-wrap text-xs sm:text-[13px]', className)}
        {...props}
      >
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link
              to="/"
              className={cn('flex items-center gap-1 transition-colors',
                isDark ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-[#147A7A]')}
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5" />
            </Link>
          </li>
          {items.map((item) => {
            const targetUrl = item.to || item.path;
            return (<li key={item.label} className="flex items-center gap-1.5">
                <span
                  className={cn('flex-shrink-0', isDark ? 'text-white/40' : 'text-gray-400')}
                  aria-hidden="true"
                >
                  {separator}
                </span>
                {targetUrl ? (<Link
                    to={targetUrl}
                    className={cn('transition-colors font-medium',
                      isDark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-[#147A7A]')}
                  >
                    {item.label}
                  </Link>) : (<span
                    className={cn('font-bold',
                      isDark ? 'text-white font-bold' : 'text-[#147A7A] font-bold')}
                    aria-current="page"
                  >
                    {item.label}
                  </span>)}
              </li>);
          })}
        </ol>
      </nav>);
  });

Breadcrumbs.displayName = 'Breadcrumbs';