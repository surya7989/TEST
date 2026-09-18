/**
 * Image Asset Helper for AT Specialists Australia
 * 
 * All 4,300+ product photos, gallery views, and variant swatches are stored
 * locally in /images/products/.
 * No external proxy or hotlinking is used.
 */

export const FALLBACK_PRODUCT_IMAGE = '/images/products/Configura-Comfort-Black-Upright-2026.webp';

/**
 * Clean clinical product placeholder SVG for when no image is available.
 * Elegant assistive medical technology device design (clean, modern, no cartoon faces).
 */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23F8FAFC'/%3E%3Crect x='1' y='1' width='398' height='398' rx='16' fill='none' stroke='%23E2E8F0' stroke-width='2'/%3E%3Cg transform='translate(160,140)' stroke='%230F766E' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='10' y='20' width='60' height='50' rx='6'/%3E%3Cpath d='M25 20V12a8 8 0 0 1 16 0v8'/%3E%3Cpath d='M40 38v14M33 45h14'/%3E%3C/g%3E%3Ctext x='200' y='245' text-anchor='middle' font-family='-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' font-size='13' font-weight='600' fill='%230F766E'%3EAT SPECIALISTS%3C/text%3E%3Ctext x='200' y='265' text-anchor='middle' font-family='-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' font-size='11' fill='%2394A3B8'%3EAssistive Technology Equipment%3C/text%3E%3C/svg%3E`;

/**
 * Return the direct image URL.
 * Automatically resolves any legacy URLs to the local /images/products/ file.
 * Completely bypasses any external or internal image proxy.
 */
export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return FALLBACK_PRODUCT_IMAGE;
  
  // Return local image path directly
  if (url.startsWith('/')) {
    return url;
  }
  
  // If an old legacy external URL is passed from local storage / cache, map to local image
  if (url.includes('rehabhire.com.au')) {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const base = parts[parts.length - 1];
      const cleanBase = base ? base.replace(/[^a-zA-Z0-9._-]/g, '_') : '';
      if (cleanBase && cleanBase !== '.') {
        return `/images/products/${cleanBase}`;
      }
    } catch {
      // ignore
    }
  }
  
  // Return URL directly without any proxy
  return url;
}

/**
 * Get a fallback image URL for when the primary image fails to load.
 */
export function getFallbackImage(): string {
  return FALLBACK_PRODUCT_IMAGE;
}

/**
 * Image error handler for <img> elements.
 * Gracefully falls back to the flagship equipment photo or clean placeholder.
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
  const target = e.currentTarget;
  // If the specific image failed, fallback to the verified local flagship product photo
  if (!target.src.includes('Configura-Comfort-Black-Upright-2026.webp') && !target.src.startsWith('data:')) {
    target.src = FALLBACK_PRODUCT_IMAGE;
    return;
  }
  // If even that fails, show the clean AT Specialists vector banner
  if (!target.src.startsWith('data:')) {
    target.src = PLACEHOLDER_IMAGE;
  }
}
