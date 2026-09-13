import { z } from 'zod';

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  productName: z.string().min(1),
  variantName: z.string().optional(),
  quantity: z.number().int().positive(),
  purchaseType: z.enum(['buy', 'hire']),
  hireDuration: z.number().int().positive().optional(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
});

export const orderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  customerId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  gst: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().positive(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).default('pending'),
  shippingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    company: z.string().optional(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    suburb: z.string(),
    state: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
    postcode: z.string(),
    country: z.literal('Australia'),
    phone: z.string().optional(),
  }),
  billingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    company: z.string().optional(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    suburb: z.string(),
    state: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
    postcode: z.string(),
    country: z.literal('Australia'),
    phone: z.string().optional(),
  }),
  paymentMethod: z.enum(['credit_card', 'paypal', 'ndis', 'bank_transfer', 'afterpay']),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).default('pending'),
  deliveryMethod: z.enum(['standard', 'express', 'white_glove', 'pickup']).default('standard'),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;