"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  DatabaseZap,
  ImageIcon,
  LinkIcon,
  Loader2,
  PackagePlus,
  Save,
  UploadCloud,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Product, ProductField } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = {
  name: string;
  category?: string;
  description?: string;
  price: number;
  cost?: number | string;
  quantity: number;
  lowStockLevel: number;
  imageUrl?: string;
  customFieldValues: Record<string, string>;
};

type ImagePreview = {
  id: string;
  name: string;
  url: string;
};

type UploadResponse = {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type ProductFormProps = {
  product?: Product;
  mode?: "create" | "edit";
};

export function ProductForm({ product, mode = "create" }: ProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(product);

  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [schemaFields, setSchemaFields] = useState<ProductField[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImagePreview[]>(() =>
    (product?.images ?? []).map((url, index) => ({
      id: `existing-${index}-${url}`,
      name: `Image ${index + 1}`,
      url,
    }))
  );

  const existingCustomValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const item of product?.customFieldValues ?? []) {
      values[item.fieldId] = item.value == null ? "" : String(item.value);
    }
    return values;
  }, [product?.customFieldValues]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: product?.name ?? "",
      category: product?.category ?? "",
      description: product?.description ?? "",
      price: Number(product?.price ?? 0),
      cost: product?.cost == null ? "" : Number(product.cost),
      quantity: product?.quantity ?? 0,
      lowStockLevel: product?.lowStockLevel ?? 5,
      imageUrl: "",
      customFieldValues: existingCustomValues,
    },
  });

  useEffect(() => {
    let active = true;

    apiFetch<ProductField[]>("/api/product-fields")
      .then((fields) => {
        if (active) setSchemaFields(fields.filter((field) => field.isActive).sort((a, b) => a.order - b.order));
      })
      .catch(() => {
        if (active) setSchemaFields([]);
      })
      .finally(() => {
        if (active) setSchemaLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!product) return;

    reset({
      name: product.name,
      category: product.category ?? "",
      description: product.description ?? "",
      price: Number(product.price ?? 0),
      cost: product.cost == null ? "" : Number(product.cost),
      quantity: product.quantity ?? 0,
      lowStockLevel: product.lowStockLevel ?? 5,
      imageUrl: "",
      customFieldValues: existingCustomValues,
    });

    setImages(
      (product.images ?? []).map((url, index) => ({
        id: `existing-${index}-${url}`,
        name: `Image ${index + 1}`,
        url,
      }))
    );
  }, [product, reset, existingCustomValues]);

  const customFieldValues = watch("customFieldValues");
  const imageUrl = watch("imageUrl");

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;

    setUploading(true);
    setImageError(null);

    try {
      const uploaded: ImagePreview[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const result = await apiFetch<UploadResponse>("/api/products/images", {
          method: "POST",
          body: formData,
        });

        uploaded.push({
          id: result.fileName,
          name: result.originalName,
          url: result.url,
        });
      }

      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  function addImageUrl() {
    const url = imageUrl?.trim();
    if (!url) return;

    try {
      new URL(url);
    } catch {
      setImageError("Enter a valid image URL");
      return;
    }

    setImages((prev) => [
      ...prev,
      {
        id: `url-${Date.now()}-${url}`,
        name: url,
        url,
      },
    ]);
    setImageError(null);
    setValue("imageUrl", "");
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((image) => image.id !== id));
  }

  async function onSubmit(values: FormValues) {
    setError(null);

    const customFieldPayload = schemaFields
      .map((field) => {
        const rawValue = values.customFieldValues?.[field.id];
        const value = parseCustomFieldValue(field, rawValue);
        return value === undefined ? null : { fieldId: field.id, value };
      })
      .filter(Boolean);

    const payload = {
      name: values.name,
      category: values.category || undefined,
      description: values.description || undefined,
      price: Number(values.price),
      cost:
        values.cost === undefined || values.cost === null || String(values.cost) === ""
          ? undefined
          : Number(values.cost),
      quantity: Number(values.quantity),
      lowStockLevel: Number(values.lowStockLevel),
      images: images.map((image) => image.url),
      customFieldValues: customFieldPayload,
    };

    try {
      if (isEdit && product) {
        await apiFetch(`/api/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      router.push("/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} product`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-5xl space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5" />
                Product details
              </CardTitle>
              <CardDescription>
                Add the main information customers, integrations, and inventory tools will use.
              </CardDescription>
            </div>

            <Badge variant="secondary">Required</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isEdit && product?.sku && (
            <div className="rounded-xl border bg-muted/40 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Generated SKU</p>
              <p className="mt-1 font-mono text-sm font-semibold">{product.sku}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product name" required>
              <Input placeholder="Classic cotton t-shirt" {...register("name", { required: true })} />
            </Field>

            <Field label="Category">
              <Input placeholder="Apparel" {...register("category")} />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              placeholder="Describe the product, material, usage, or anything important."
              className="min-h-28 resize-none"
              {...register("description")}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Set the selling price and optional internal cost.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field label="Price" required>
              <Input type="number" step="0.01" min={0} placeholder="299.99" {...register("price", { required: true })} />
            </Field>

            <Field label="Cost">
              <Input type="number" step="0.01" min={0} placeholder="120.00" {...register("cost")} />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Set stock quantity and the low-stock threshold used by the dashboard.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Quantity" required>
              <Input type="number" min={0} placeholder="0" {...register("quantity", { required: true })} />
            </Field>

            <Field label="Low stock alert" required>
              <Input type="number" min={0} placeholder="5" {...register("lowStockLevel", { required: true })} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Upload product images to the API or paste image URLs. Saved products store URLs in the images field.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {imageError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {imageError}
            </div>
          )}

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition hover:bg-muted/50">
            {uploading ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" /> : <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />}
            <span className="text-sm font-medium">{uploading ? "Uploading images..." : "Click to upload product images"}</span>
            <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, GIF. Max 5MB per file.</span>

            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(event) => handleImageUpload(event.target.files)}
            />
          </label>

          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="https://example.com/product.jpg" {...register("imageUrl")} />
            </div>
            <Button type="button" variant="outline" onClick={addImageUrl}>Add image URL</Button>
          </div>

          {images.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="group relative overflow-hidden rounded-xl border bg-muted/30">
                  <img src={image.url} alt={image.name} className="h-40 w-full object-cover transition group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow-sm transition hover:bg-background"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="border-t bg-background p-2">
                    <p className="truncate text-xs text-muted-foreground">{image.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <ImageIcon className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No images added yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="h-5 w-5" />
            Product schema fields
          </CardTitle>
          <CardDescription>
            These fields come from your organization schema and are saved through the backend customFieldValues API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schemaLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading product schema...
            </div>
          ) : schemaFields.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No product schema fields yet. Add fields under Products → Product schema to capture custom product attributes.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {schemaFields.map((field) => (
                <Field key={field.id} label={field.label} required={field.required}>
                  <SchemaFieldInput
                    field={field}
                    value={customFieldValues?.[field.id] ?? ""}
                    onChange={(value) => setValue(`customFieldValues.${field.id}`, value, { shouldDirty: true })}
                  />
                </Field>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="sticky bottom-4 z-10 border bg-background/95 shadow-lg backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{isEdit ? "Ready to update this product?" : "Ready to create this product?"}</p>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Changes will update product details and inventory logs through the API."
                : "The backend will generate the SKU and create the initial inventory log."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/products")} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update product
                </>
              ) : (
                <>
                  <PackagePlus className="mr-2 h-4 w-4" />
                  Save product
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function SchemaFieldInput({
  field,
  value,
  onChange,
}: {
  field: ProductField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "boolean") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select true or false" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "json") {
    return (
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 resize-none font-mono text-sm"
        placeholder='{ "supplier": "Acme" }'
      />
    );
  }

  return (
    <Input
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.type === "number" ? "10" : field.type === "date" ? "" : `Enter ${field.label.toLowerCase()}`}
    />
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function parseCustomFieldValue(field: ProductField, rawValue: string | undefined) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return undefined;

  if (field.type === "number") {
    const value = Number(rawValue);
    return Number.isNaN(value) ? undefined : value;
  }

  if (field.type === "boolean") return rawValue === "true";

  if (field.type === "json") {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}
