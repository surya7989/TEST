export function calculateGST(amount: number): number {
  return Math.round(amount * 0.1 * 100) / 100;
}

export function calculatePriceWithGST(amount: number): number {
  return Math.round(amount * 1.1 * 100) / 100;
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AT${year}${month}${day}${random}`;
}

export function generateSKU(prefix: string = 'AT'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}