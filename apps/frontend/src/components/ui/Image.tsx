import { forwardRef, ImgHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';
import { proxyImageUrl } from '@/lib/imageProxy';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  className?: string;
  /** Set to true to skip the image proxy (e.g. for local/SVG images) */
  skipProxy?: boolean;
}

const AppImage = forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt, fill, priority, sizes, placeholder = 'empty', className, skipProxy = false, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    // Route through image asset resolver if needed
    const proxiedSrc = skipProxy ? src : proxyImageUrl(src);

    if (hasError) {
      return (
        <div
          className={cn(
            'relative bg-neutral-100 flex items-center justify-center text-text-muted',
            fill ? 'absolute inset-0' : '',
            className
          )}
          role="img"
          aria-label={alt}
        >
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      );
    }

    return (
      <div className={cn('relative overflow-hidden', fill ? 'absolute inset-0' : '', className)}>
        <img
          ref={ref}
          src={proxiedSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          onError={() => setHasError(true)}
          className={cn(fill ? 'h-full w-full object-cover' : '')}
          {...props}
        />
      </div>
    );
  }
);

AppImage.displayName = 'Image';

export { AppImage as Image };