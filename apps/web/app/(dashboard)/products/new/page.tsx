import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Products</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create product</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Add a product, upload images, set inventory, and attach custom attributes for this organization.
          </p>
        </div>

        <ProductForm />
      </div>
    </main>
  );
}