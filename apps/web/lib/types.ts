export type ProductCustomFieldValue = {
  id?: string;
  fieldId: string;
  value: unknown;
  field?: {
    id: string;
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    order?: number;
  };
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  price: string | number;
  cost?: string | number | null;
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
