import React, { useRef } from 'react';
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
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * High-performance product image component:
 * - Always visible, never hidden by opacity-0 state bugs
 * - Routes through local image resolver and handles error fallbacks gracefully
 * - Supports browser-level fetchPriority for lightning fast LCP
 */
export function ProductImage({
  src,
  alt,
  className = '',
  eager = false,
  draggable,
  style,
  onClick,
  fetchPriority,
}: ProductImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const resolvedSrc = proxyImageUrl(src);

  return (
    <img
      ref={imgRef}
      src={resolvedSrc}
      alt={alt}
      draggable={draggable}
      onClick={onClick}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={fetchPriority || (eager ? 'high' : 'auto')}
      decoding="async"
      onError={handleImageError}
      style={style}
      className={`${className} bg-slate-50`}
    />
  );
}

export default ProductImage;
