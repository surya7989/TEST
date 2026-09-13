import { z } from 'zod';

export const enquirySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['general', 'product', 'hire', 'ndis', 'repair', 'trial', 'quote', 'complaint', 'other']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  productId: z.string().uuid().optional(),
  productName: z.string().optional(),
  message: z.string().min(10),
  status: z.enum(['new', 'in_progress', 'resolved', 'closed']).default('new'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Enquiry = z.infer<typeof enquirySchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;