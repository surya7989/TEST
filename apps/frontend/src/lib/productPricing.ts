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
 * - hire-only products -> weekly hire price/range + /wk indicator.
 * - simple products   -> base price, quick-add is safe.
 * - quote-only        -> "Price on Application"
 */

export interface VariantPriceInfo {
  /** Product sells through priced variants (sizes/options). */
  hasPricedVariants: boolean;
  /** Lowest positive price (0 when none). */
  min: number;
  /** Highest positive price (0 when none). */
  max: number;
  /** Base catalogue price (buyPrice/price/hirePrice). */
  base: number;
  /** True when the listing must route to the detail page for options. */
  needsOptions: boolean;
  /** True when the product is only available for hire (not outright buy). */
  isHireOnly: boolean;
}

export function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getVariantPriceInfo(product: {
  buyPrice?: number;
  price?: number;
  hirePrice?: number;
  hireAvailable?: boolean;
  buyAvailable?: boolean;
  purchaseType?: string;
  variants?: { price?: number; hirePrice?: number; attributes?: Record<string, string> }[] | null;
}): VariantPriceInfo {
  const base = Number(product.buyPrice ?? product.price ?? 0) || 0;
  const hp = Number(product.hirePrice || 0);
  const allVariants = ((product.variants || []) as { price?: number; hirePrice?: number; attributes?: Record<string, string> }[]);
  
  const isHireOnly = (product.purchaseType === 'hire' || (product.buyAvailable === false && (product.hireAvailable || hp > 0))) && base <= 0;

  if (isHireOnly) {
    const hireVariants = allVariants.filter(
      (v) => v.attributes && v.attributes['purchase-type'] === 'hire'
    );
    const hirePrices = hireVariants.length > 0
      ? hireVariants.map((v) => Number(v.hirePrice || v.price || 0)).filter((p) => p > 0)
      : allVariants.map((v) => Number(v.hirePrice || hp)).filter((p) => p > 0);
    const hasPricedVariants = hirePrices.length > 0;
    const min = hasPricedVariants ? Math.min(...hirePrices) : hp;
    const max = hasPricedVariants ? Math.max(...hirePrices) : hp;
    return {
      hasPricedVariants,
      min,
      max,
      base: hp,
      needsOptions: (allVariants.length > 1) || hasPricedVariants,
      isHireOnly: true,
    };
  }

  // Buy variants (exclude hire fleet variants)
  const buyVariants = allVariants.filter(
    (v) => v.attributes && v.attributes['purchase-type'] === 'buy'
  );
  const nonHireVariants = allVariants.filter(
    (v) => !v.attributes || v.attributes['purchase-type'] !== 'hire'
  );
  const candidateVariants = buyVariants.length > 0 ? buyVariants : nonHireVariants;

  const variantPrices = candidateVariants
    .map((v) => Number(v.price) || 0)
    .filter((p) => p > 0);
  const hasPricedVariants = variantPrices.length > 0;
  const min = hasPricedVariants ? Math.min(...variantPrices) : base;
  const max = hasPricedVariants ? Math.max(...variantPrices) : base;
  return {
    hasPricedVariants,
    min,
    max,
    base,
    needsOptions: (allVariants.length > 1) || hasPricedVariants,
    isHireOnly: false,
  };
}

/**
 * Returns formatted price label:
 * - "$4,948.00" (single buy)
 * - "$276.00 – $6,160.00" (buy range)
 * - "$920.00/wk" (hire only single)
 * - "$58.00 – $59.00/wk" (hire only range)
 * - "Price on Application" (quote required)
 */
export function formatPriceLabel(product: {
  buyPrice?: number;
  price?: number;
  hirePrice?: number;
  hireAvailable?: boolean;
  buyAvailable?: boolean;
  purchaseType?: string;
  quoteRequired?: boolean;
  variants?: { price?: number; hirePrice?: number; attributes?: Record<string, string> }[] | null;
}): string {
  const info = getVariantPriceInfo(product);

  if (info.isHireOnly) {
    if (info.hasPricedVariants && info.min !== info.max && info.min > 0) {
      return `${formatCurrency(info.min)} – ${formatCurrency(info.max)}/wk`;
    }
    const singleHire = info.hasPricedVariants ? info.min : info.base;
    if (singleHire > 0) return `${formatCurrency(singleHire)}/wk`;
    return 'Price on Application';
  }

  if (info.hasPricedVariants && info.min !== info.max && info.min > 0) {
    return `${formatCurrency(info.min)} – ${formatCurrency(info.max)}`;
  }
  const single = info.hasPricedVariants ? info.min : info.base;
  if (single > 0) return formatCurrency(single);

  // Fallback check if product has a hire rate
  const hp = Number(product.hirePrice || 0);
  if (hp > 0 && product.hireAvailable) {
    return `${formatCurrency(hp)}/wk`;
  }

  return 'Price on Application';
}
