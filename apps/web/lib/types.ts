export type ProductFieldType = "text" | "number" | "boolean" | "select" | "date" | "json";

export type ProductField = {
  id: string;
  organizationId?: string;
  key: string;
  label: string;
  type: ProductFieldType;
  required: boolean;
  options: string[];
  defaultValue?: unknown;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductCustomFieldValue = {
  id?: string;
  fieldId: string;
  value: unknown;
  field?: ProductField;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: string | number;
  priceCurrency?: string | null;
  cost?: string | number | null;
  costCurrency?: string | null;
  exchangeRateToBase?: string | number | null;
  convertedCost?: string | number | null;
  quantity: number;
  lowStockLevel: number;
  category?: string | null;
  images?: string[];
  metadata?: Record<string, unknown> | null;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  customFieldValues?: ProductCustomFieldValue[];
};

export type Paginated<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type Dashboard = {
  totalProducts: number;
  lowStock: number;
  inventoryValue: number;
  apiKeyCount: number;
  webhookCount: number;
  recentActivity: Array<{ id: string; message: string; createdAt: string }>;
};
