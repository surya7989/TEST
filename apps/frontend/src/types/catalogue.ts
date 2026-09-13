/**
 * Normalized Product & Catalogue Data Models
 * Inspired by Rehab Hire & Sales clinical taxonomy, adapted for AT Specialists Australia.
 */

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentSlug?: string | null;
  depth: number;
  path: string;
  description?: string;
  image?: string;
  productCount?: number;
  children?: Category[];
}

export interface AttributeValue {
  label: string;
  value: string;
  colorHex?: string;
  badge?: string;
}

export interface ProductAttribute {
  id: string;
  name: string; // e.g. "Size", "Colour", "Depth", "Configuration"
  slug: string; // e.g. "size", "colour", "depth"
  type: 'select' | 'radio' | 'color';
  values: AttributeValue[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>; // e.g. { "size": "large", "colour": "black" }
  price?: number;
  hirePrice?: number;
  salePrice?: number;
  image?: string;
  galleryImages?: string[];
  stockStatus?: 'in_stock' | 'out_of_stock' | 'on_backorder';
  available: boolean;
}

export interface OptionalEquipment {
  id: string;
  name: string;
  sku?: string;
  price: number;
  hirePrice?: number;
  priceType: 'quantity_based' | 'flat_fee';
  description?: string;
  category?: string;
}

export interface ProductDocument {
  id: string;
  title: string;
  url: string;
  type: 'manual' | 'brochure' | 'assessment' | 'guide' | 'spec_sheet' | 'order_form';
  fileSize?: string;
}

export interface ProductSpecification {
  group?: string;
  name: string;
  value: string;
}

export type PurchaseType = 'buy' | 'hire' | 'both' | 'quote_only';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  shortDescription: string;
  fullDescription: string;
  purchaseType: PurchaseType;
  hireAvailable: boolean;
  buyAvailable: boolean;
  hirePrice: number;
  buyPrice: number;
  price?: number; // Compatibility alias for buyPrice
  category?: string; // Compatibility alias for primary category
  description?: string; // Compatibility alias for shortDescription
  salePrice?: number;
  image: string;
  galleryImages: string[];
  thumbnail: string;
  categories: string[]; // Category slugs
  categoryPath?: string[];
  tags: string[];
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  optionalEquipment: OptionalEquipment[];
  accessories: string[]; // Product IDs or slugs
  relatedProductIds: string[];
  documents: ProductDocument[];
  videos?: string[];
  specifications: ProductSpecification[];
  features: string[];
  benefits?: string[];
  compliance?: string[];
  warranty?: string;
  swl?: string; // Safe Working Load
  weight?: string;
  dimensions?: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'order_only';
  quoteRequired: boolean;
  gstType: 'standard' | 'gst-free' | 'custom';
  gstRate: number;
  deliveryFee: number;
  freeDelivery: boolean;
  rating: number;
  reviewCount: number;
  badge?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryHierarchyTree {
  [categorySlug: string]: {
    category: Category;
    subcategories: Category[];
  };
}
