/**
 * Image Proxy Utility
 * 
 * Rehab Hire (rehabhire.com.au) blocks hotlinking of images (returns 403).
 * This utility routes all external product images through our own server-side
 * proxy so they load correctly in the browser.
 * 
 * In development: Vite dev server proxy at /img-proxy/
 * In production: PHP backend proxy at /api/img-proxy.php
 */

const PROXY_PREFIX = '/img-proxy/';

/**
 * Placeholder SVG data URI for when images fail to load.
 * Shows a clean product placeholder icon.
 */
export const PLACEHOLDER_IMAGE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23F1F5F9'/%3E%3Cg transform='translate(150,140)'%3E%3Cpath d='M50 0C22.4 0 0 22.4 0 50v20c0 27.6 22.4 50 50 50s50-22.4 50-50V50C100 22.4 77.6 0 50 0z' fill='%23CBD5E1'/%3E%3Ccircle cx='35' cy='45' r='5' fill='%2394A3B8'/%3E%3Ccircle cx='65' cy='45' r='5' fill='%2394A3B8'/%3E%3Cpath d='M35 70c0 0 5 10 15 10s15-10 15-10' stroke='%2394A3B8' fill='none' stroke-width='3' stroke-linecap='round'/%3E%3C/g%3E%3Ctext x='200' y='250' text-anchor='middle' font-family='Arial,sans-serif' font-size='14' fill='%2394A3B8'%3EProduct Image%3C/text%3E%3C/svg%3E`;

/**
 * Convert an external image URL to go through our proxy.
 * Only proxies rehabhire.com.au URLs; other URLs pass through unchanged.
 */
export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return PLACEHOLDER_IMAGE;
  
  // Only proxy rehabhire.com.au URLs
  if (url.includes('rehabhire.com.au')) {
    // Strip upstream scheme and host to avoid triggering WAF / ModSecurity RFI rules
    const cleanPath = url.replace(/^https?:\/\/(?:www\.)?rehabhire\.com\.au/i, '');
    if (cleanPath.startsWith('/')) {
      return `${PROXY_PREFIX}?path=${encodeURIComponent(cleanPath)}`;
    }
    return `${PROXY_PREFIX}?url=${encodeURIComponent(url)}`;
  }
  
  // Return other URLs as-is (local images, unsplash, etc.)
  return url;
}

/**
 * Get a fallback image URL for when the primary image fails to load.
 */
export function getFallbackImage(): string {
  return PLACEHOLDER_IMAGE;
}

/**
 * Image error handler for <img> elements.
 * Sets the src to the placeholder on error.
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
  const target = e.currentTarget;
  // Prevent infinite loop if placeholder also fails
  if (!target.src.startsWith('data:')) {
    target.src = PLACEHOLDER_IMAGE;
  }
}
