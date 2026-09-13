import React, { useState, useEffect, useRef } from 'react';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

interface ProductImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  /** Load immediately (above-the-fold / first results). Defaults to lazy. */
  eager?: boolean;
  draggable?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

/**
 * Fast-perceived product image:
 * - shimmer background while the (often large) supplier photo streams in,
 * so slow loads never look like a blank white box
 * - smooth fade-in once decoded
 * - supplier URLs routed through the image proxy + graceful placeholder fallback
 * - resets correctly when src changes (variant colour/size switching)
 */
export function ProductImage({ src, alt, className = '', eager = false, draggable, style, onClick }: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Already in browser cache (variant switching back and forth, repeat views):
    // show instantly with no fade flash. Otherwise start hidden and fade in on load.
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (<img
      ref={imgRef}
      src={proxyImageUrl(src)}
      alt={alt}
      draggable={draggable}
      onClick={onClick}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={(e) => {
        setLoaded(true);
        handleImageError(e);
      }}
      style={loaded ? style : {...style, transition: 'opacity 0.4s ease' }}
      className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} bg-slate-100`}
    />);
}

export default ProductImage;
