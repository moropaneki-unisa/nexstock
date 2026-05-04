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
  createdAt: string;
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
