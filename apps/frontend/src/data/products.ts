import { Product } from '../types/catalogue';
export type { Product };
import { getVariantPriceInfo } from '../lib/productPricing';
import rawProducts from './products.json';
import { useAdminStore } from '../store/adminStore';

export const RAW_PRODUCTS: Product[] = rawProducts as Product[];
export const PRODUCTS: Product[] = RAW_PRODUCTS;
export const products: Product[] = PRODUCTS;
export default PRODUCTS;
import { resolveProductBrand } from '../lib/brandUtils';
export { resolveProductBrand };

/**
 * Returns current effective products from dynamic adminStore, or raw catalogue fallback.
 */
export function getEffectiveProducts(): Product[] {
  try {
    const storeProducts = useAdminStore.getState()?.products;
    if (Array.isArray(storeProducts) && storeProducts.length > 0) {
      return storeProducts as Product[];
    }
  } catch {
    // Store not yet initialized
  }
  return RAW_PRODUCTS;
}

/**
 * Reactive React hook returning the dynamic, live products array.
 * Re-renders components immediately whenever any product is added, updated, or deleted.
 */
export function useProducts(): Product[] {
  const storeProds = useAdminStore((s) => s.products);
  return (storeProds && storeProds.length > 0 ? storeProds : RAW_PRODUCTS) as Product[];
}

export function getProductBySlug(slug: string): Product | undefined {
  if (!slug) return undefined;
  const sLower = slug.toLowerCase().trim();
  const cleanSlug = sLower.replace(/[^a-z0-9]+/g, '-');
  const all = getEffectiveProducts();

  return all.find((p) =>
      p.slug === slug ||
      p.slug?.toLowerCase() === sLower ||
      p.slug?.toLowerCase() === cleanSlug ||
      p.id?.toLowerCase() === sLower ||
      p.sku?.toLowerCase() === sLower);
}

export function getProductById(id: string): Product | undefined {
  if (!id) return undefined;
  const idLower = id.toLowerCase().trim();
  const all = getEffectiveProducts();

  return all.find((p) =>
      p.id === id ||
      p.id?.toLowerCase() === idLower ||
      p.sku?.toLowerCase() === idLower ||
      p.slug?.toLowerCase() === idLower);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  const catLower = (categorySlug || '').toLowerCase().trim();
  const all = getEffectiveProducts();
  return all.filter((p) =>
    (p.categories || []).some((c) => c.toLowerCase() === catLower) ||
    ((p as any).category && (p as any).category.toLowerCase() === catLower));
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  const all = getEffectiveProducts();
  if (!q) return all;
  return all.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))));
}

export interface ProductFilterOptions {
  categorySlug?: string;
  brand?: string;
  purchaseType?: 'all' | 'buy' | 'hire';
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  sortBy?: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'popular';
}

export function filterProducts(options: ProductFilterOptions): Product[] {
  let result = [...getEffectiveProducts()];

  if (options.categorySlug && options.categorySlug !== 'all') {
    const catLower = options.categorySlug.toLowerCase();
    result = result.filter((p) =>
        (p.categories || []).some((c) => c.toLowerCase() === catLower) ||
        ((p as any).category && (p as any).category.toLowerCase() === catLower));
  }

  if (options.brand && options.brand !== 'all') {
    result = result.filter((p) => p.brand.toLowerCase() === options.brand!.toLowerCase());
  }

  if (options.purchaseType && options.purchaseType !== 'all') {
    if (options.purchaseType === 'hire') {
      result = result.filter((p) => p.hireAvailable);
    } else if (options.purchaseType === 'buy') {
      result = result.filter((p) => p.buyAvailable);
    }
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    result = result.filter((p) => {
      const info = getVariantPriceInfo(p);
      const effectivePrice = info.hasPricedVariants ? info.min : (p.buyPrice || p.price || 0);
      if (options.minPrice !== undefined && effectivePrice < options.minPrice) return false;
      if (options.maxPrice !== undefined && effectivePrice > options.maxPrice) return false;
      return true;
    });
  }

  if (options.searchQuery) {
    const q = options.searchQuery.toLowerCase().trim();
    result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q));
  }

  if (options.sortBy) {
    switch (options.sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-asc': {
        const ep = (p: Product) => { const i = getVariantPriceInfo(p); return i.hasPricedVariants ? i.min : (p.buyPrice || p.price || 0); };
        result.sort((a, b) => ep(a) - ep(b));
        break;
      }
      case 'price-desc': {
        const ep = (p: Product) => { const i = getVariantPriceInfo(p); return i.hasPricedVariants ? i.min : (p.buyPrice || p.price || 0); };
        result.sort((a, b) => ep(b) - ep(a));
        break;
      }
      case 'popular':
      default:
        result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
    }
  }

  return result;
}
