import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPrice(price: number): string {
  return formatCurrency(price);
}

export function formatHirePrice(daily: number, weekly: number, monthly: number): string {
  return `From ${formatCurrency(daily)}/day`;
}

/**
 * Single canonical estimate for a weekly hire rate when a product has no
 * published hire price. Used by the cart store, product page and rentals
 * so every surface quotes the same fallback figure.
 */
export function estimateWeeklyHireRate(buyPrice: number): number {
  if (!buyPrice || buyPrice <= 0) return 0;
  return Math.round(buyPrice * 0.035 * 100) / 100;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getAustralianStates(): { value: string; label: string }[] {
  return [
    { value: 'NSW', label: 'New South Wales' },
    { value: 'VIC', label: 'Victoria' },
    { value: 'QLD', label: 'Queensland' },
    { value: 'WA', label: 'Western Australia' },
    { value: 'SA', label: 'South Australia' },
    { value: 'TAS', label: 'Tasmania' },
    { value: 'ACT', label: 'Australian Capital Territory' },
    { value: 'NT', label: 'Northern Territory' },
  ];
}

export function validateAustralianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^(\+61|0)[2-9]\d{8}$/.test(cleaned);
}

export function formatAustralianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('61')) {
    return `+61 ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

export function validatePostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode);
}

export function calculateGST(amount: number): number {
  return Math.round(amount * 0.1 * 100) / 100;
}

export function calculatePriceWithGST(amount: number): number {
  return Math.round(amount * 1.1 * 100) / 100;
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getColorSwatchHex(value: string, colorHex?: string): string {
  if (colorHex) return colorHex;
  const v = value.toLowerCase();
  if (v.includes('black')) return '#1F2937';
  if (v.includes('navy')) return '#1E3A8A';
  if (v.includes('blue')) return '#2563EB';
  if (v.includes('red')) return '#DC2626';
  if (v.includes('green')) return '#16A34A';
  if (v.includes('yellow')) return '#EAB308';
  if (v.includes('pink')) return '#EC4899';
  if (v.includes('purple')) return '#9333EA';
  if (v.includes('charcoal')) return '#374151';
  if (v.includes('grey') || v.includes('gray')) return '#6B7280';
  if (v.includes('silver')) return '#9CA3AF';
  if (v.includes('tan') || v.includes('beige')) return '#D2B48C';
  if (v.includes('cream')) return '#FEF3C7';
  if (v.includes('white')) return '#FFFFFF';
  if (v.includes('brown')) return '#78350F';
  if (v.includes('maroon') || v.includes('burgundy')) return '#800000';
  if (v.includes('orange')) return '#EA580C';
  return '#94A3B8';
}