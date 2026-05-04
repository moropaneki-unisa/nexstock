import { ProductFieldsManager } from "@/components/products/product-fields-manager";

export default function ProductFieldsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Product fields
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Define the custom product schema for this organization. Every product
          you create will inherit these fields automatically.
        </p>
      </div>

      <ProductFieldsManager />
    </div>
  );
}