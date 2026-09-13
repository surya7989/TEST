import { z } from 'zod';

export const addressSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['billing', 'shipping', 'both']).default('both'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  suburb: z.string().min(1),
  state: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  postcode: z.string().regex(/^\d{4}$/),
  country: z.literal('Australia'),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  ndisNumber: z.string().optional(),
  ndisPlanManaged: z.boolean().default(false),
  addresses: z.array(addressSchema).default([]),
  preferences: z.object({
    marketingEmails: z.boolean().default(false),
    smsNotifications: z.boolean().default(false),
    preferredContact: z.enum(['email', 'phone', 'sms']).default('email'),
  }).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type Address = z.infer<typeof addressSchema>;