/**
 * Canonical variant-aware pricing labels.
 *
 * Catalogue base prices (buyPrice) are unreliable for products that sell
 * through variants (sizes/options carry their own prices, sometimes far
 * from the base). Every surface that shows a price or quick-adds MUST use
 * these helpers so listings never contradict the product page / checkout:
 * - variant products  -> price range (or single variant price) + MUST go
 *   through the product page ("Select options"), never blind quick-add
 *   at the base price.
 * - simple products    -> base price, quick-add is safe.
 */

export interface VariantPriceInfo {
  /** Product sells through priced variants (sizes/options). */
  hasPricedVariants: boolean;
  /** Lowest positive variant price (0 when none). */
  min: number;
  /** Highest positive variant price (0 when none). */
  max: number;
  /** Base catalogue price (buyPrice/price). */
  base: number;
  /** True when the listing must route to the detail page for options. */
  needsOptions: boolean;
}

export function getVariantPriceInfo(product: {
  buyPrice?: number;
  price?: number;
  variants?: { price?: number }[] | null;
}): VariantPriceInfo {
  const base = Number(product.buyPrice ?? product.price ?? 0) || 0;
  const variantPrices = ((product.variants || []) as { price?: number }[])
    .map((v) => Number(v.price) || 0)
    .filter((p) => p > 0);
  const hasPricedVariants = variantPrices.length > 0;
  const min = hasPricedVariants ? Math.min(...variantPrices) : base;
  const max = hasPricedVariants ? Math.max(...variantPrices) : base;
  return { hasPricedVariants, min, max, base, needsOptions: hasPricedVariants };
}

/** "$4,948.00" or "$276.00 – $6,160.00". Empty string when no price at all. */
export function formatPriceLabel(product: {
  buyPrice?: number;
  price?: number;
  variants?: { price?: number }[] | null;
}): string {
  const info = getVariantPriceInfo(product);
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (info.hasPricedVariants && info.min !== info.max) {
    return `${fmt(info.min)} – ${fmt(info.max)}`;
  }
  const single = info.hasPricedVariants ? info.min : info.base;
  return single > 0 ? fmt(single) : '';
}
