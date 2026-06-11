import { z } from 'zod';

// Shopify Webhook Identity Validation
export const ShopifyWebhookSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  created_at: z.string().datetime(),
  line_items: z.array(z.object({
    id: z.number(),
    product_id: z.number(),
    quantity: z.number(),
    name: z.string(),
  })),
  customer: z.object({
    id: z.number().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
  }).optional(),
});

// Internal Product Schemas
export const SecurityConfigSchema = z.object({
  maxDownloads: z.number().int().min(1).optional(),
  expirationHours: z.number().int().min(1).optional(),
  ipBlock: z.boolean().default(false),
  keysAvailable: z.number().int().min(0).optional(),
});

export const ProductSchema = z.object({
  id: z.string().min(1),
  shopDns: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['digital', 'license', 'physical']),
  price: z.number().min(0),
  sales: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  config: SecurityConfigSchema.optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ShopifyWebhook = z.infer<typeof ShopifyWebhookSchema>;
