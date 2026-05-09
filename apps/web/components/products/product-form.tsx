"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  DatabaseZap,
  ImageIcon,
  LinkIcon,
  Loader2,
  PackagePlus,
  Save,
  ShieldCheck,
  UploadCloud,
  Warehouse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
    formState: { isSubmitting, errors, isDirty },
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
  const name = watch("name");
  const price = Number(watch("price") ?? 0);
  const cost = watch("cost") === "" ? undefined : Number(watch("cost") ?? 0);
  const quantity = Number(watch("quantity") ?? 0);
  const lowStockLevel = Number(watch("lowStockLevel") ?? 0);
  const requiredSchemaFields = schemaFields.filter((field) => field.required);
  const completedRequiredSchemaFields = requiredSchemaFields.filter((field) => {
    const value = customFieldValues?.[field.id];
    return value !== undefined && value !== null && String(value).trim() !== "";
  }).length;
  const readiness = [
    { label: "Name", ready: Boolean(name?.trim()) },
    { label: "Price", ready: Number.isFinite(price) && price >= 0 },
    { label: "Inventory", ready: Number.isFinite(quantity) && quantity >= 0 && Number.isFinite(lowStockLevel) && lowStockLevel >= 0 },
    { label: "Images", ready: images.length > 0 },
  ];

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;

    setUploading(true);
    setImageError(null);

    try {
      const uploaded: ImagePreview[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file.`);
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 5MB.`);
        }

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

    const missingRequiredField = requiredSchemaFields.find((field) => {
      const value = values.customFieldValues?.[field.id];
      return value === undefined || value === null || String(value).trim() === "";
    });

    if (missingRequiredField) {
      setError(`Custom field "${missingRequiredField.label}" is required.`);
      return;
    }

    const customFieldPayload = schemaFields
      .map((field) => {
        const rawValue = values.customFieldValues?.[field.id];
        const value = parseCustomFieldValue(field, rawValue);
        return value === undefined ? null : { fieldId: field.id, value };
      })
      .filter(Boolean);

    const payload = {
      name: values.name.trim(),
      category: values.category?.trim() || undefined,
      description: values.description?.trim() || undefined,
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
      let savedProduct: Product | null = null;
      if (isEdit && product) {
        savedProduct = await apiFetch<Product>(`/api/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        savedProduct = await apiFetch<Product>("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      router.push(savedProduct?.id ? `/products/${savedProduct.id}` : "/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} product`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {error && (
          <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PackagePlus className="h-5 w-5" />
                  Product details
                </CardTitle>
                <CardDescription className="mt-1">
                  Add the main information customers, integrations, and inventory tools will use.
                </CardDescription>
              </div>

              <Badge variant="secondary" className="rounded-full">Required</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            {isEdit && product?.sku && (
              <div className="rounded-2xl border bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Generated SKU</p>
                <p className="mt-1 font-mono text-sm font-semibold">{product.sku}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product name" required error={errors.name ? "Product name is required" : undefined}>
                <Input className="rounded-xl" placeholder="Classic cotton t-shirt" {...register("name", { required: true })} />
              </Field>

              <Field label="Category">
                <Input className="rounded-xl" placeholder="Apparel" {...register("category")} />
              </Field>
            </div>

            <Field label="Description">
              <Textarea
                placeholder="Describe the product, material, usage, supplier notes, or anything important."
                className="min-h-32 resize-none rounded-xl"
                {...register("description")}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5 lg:col-span-2">
            <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
              <CardDescription>Set the selling price and optional internal cost.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <Field label="Price" required error={errors.price ? "Price is required" : undefined}>
                <Input className="rounded-xl" type="number" step="0.01" min={0} placeholder="299.99" {...register("price", { required: true, valueAsNumber: true })} />
              </Field>

              <Field label="Cost">
                <Input className="rounded-xl" type="number" step="0.01" min={0} placeholder="120.00" {...register("cost")} />
              </Field>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5 lg:col-span-3">
            <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Inventory
              </CardTitle>
              <CardDescription>Set stock quantity and the low-stock threshold used by the dashboard.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Quantity" required error={errors.quantity ? "Quantity is required" : undefined}>
                <Input className="rounded-xl" type="number" min={0} placeholder="0" {...register("quantity", { required: true, valueAsNumber: true })} />
              </Field>

              <Field label="Low stock alert" required error={errors.lowStockLevel ? "Low stock alert is required" : undefined}>
                <Input className="rounded-xl" type="number" min={0} placeholder="5" {...register("lowStockLevel", { required: true, valueAsNumber: true })} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product images
            </CardTitle>
            <CardDescription>
              Upload images to the API or paste image URLs. The first image becomes the primary product image.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            {imageError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {imageError}
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center transition hover:bg-muted/45">
              {uploading ? <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" /> : <UploadCloud className="mb-3 h-8 w-8 text-muted-foreground" />}
              <span className="text-sm font-medium">{uploading ? "Uploading images..." : "Upload product images"}</span>
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
                <Input className="rounded-xl pl-9" placeholder="https://example.com/product.jpg" {...register("imageUrl")} />
              </div>
              <Button type="button" variant="outline" onClick={addImageUrl} className="rounded-xl bg-background/70">Add image URL</Button>
            </div>

            {images.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {images.map((image, index) => (
                  <div key={image.id} className="group relative overflow-hidden rounded-2xl border bg-muted/30 shadow-sm">
                    <img src={image.url} alt={image.name} className="h-44 w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute left-2 top-2">
                      <Badge className="rounded-full bg-background/90 text-foreground hover:bg-background/90">{index === 0 ? "Primary" : `Image ${index + 1}`}</Badge>
                    </div>
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
              <div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center">
                <ImageIcon className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium">No images added yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Products look more complete with at least one image.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseZap className="h-5 w-5" />
                  Product schema fields
                </CardTitle>
                <CardDescription>
                  Custom fields from your organization schema are saved through the backend customFieldValues API.
                </CardDescription>
              </div>
              {requiredSchemaFields.length > 0 && <Badge variant="secondary" className="rounded-full">{completedRequiredSchemaFields}/{requiredSchemaFields.length} required</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {schemaLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading product schema...
              </div>
            ) : schemaFields.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
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
      </div>

      <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Card className="rounded-[2rem] border-border/80 bg-card/95 shadow-xl shadow-slate-950/5">
          <CardHeader className="border-b bg-gradient-to-br from-card to-muted/35">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" />
              Product readiness
            </CardTitle>
            <CardDescription>Complete the essentials before saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {readiness.map((item) => (
              <ReadinessLine key={item.label} ready={item.ready} label={item.label} />
            ))}
            {requiredSchemaFields.length > 0 && (
              <ReadinessLine ready={completedRequiredSchemaFields === requiredSchemaFields.length} label="Required schema fields" />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-xl shadow-slate-950/10">
          <CardContent className="p-6">
            <PackagePlus className="h-7 w-7 text-white/80" />
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{isEdit ? "Update confidently" : "Create clean data"}</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {isEdit
                ? "Changes are saved through the API and keep the product ready for integrations, imports, and customer-facing views."
                : "NexStock will generate the SKU, create the product, and log the starting inventory value."}
            </p>
            <div className="mt-5 grid gap-2 text-sm">
              <SideFact label="Margin" value={calculateMargin(price, cost)} />
              <SideFact label="Stock status" value={quantity <= lowStockLevel ? "Needs review" : "Healthy"} />
              <SideFact label="Images" value={`${images.length}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="sticky bottom-4 z-10 border bg-background/95 shadow-xl shadow-slate-950/10 backdrop-blur">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-sm font-medium">{isEdit ? "Ready to update this product?" : "Ready to create this product?"}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {isEdit
                  ? "Save only when the product data is accurate for customers, APIs, and integrations."
                  : "The backend will generate the SKU and create the initial inventory log."}
              </p>
              {isDirty && <Badge variant="secondary" className="mt-3 rounded-full">Unsaved changes</Badge>}
            </div>

            <div className="grid gap-2">
              <Button type="submit" disabled={isSubmitting || uploading} className="rounded-xl">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isEdit ? (
                  <>
                    <Save className="h-4 w-4" />
                    Update product
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-4 w-4" />
                    Save product
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push(isEdit && product ? `/products/${product.id}` : "/products")} disabled={isSubmitting} className="rounded-xl bg-background/70">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
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
        <SelectTrigger className="rounded-xl">
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
        <SelectTrigger className="rounded-xl">
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
        className="min-h-24 resize-none rounded-xl font-mono text-sm"
        placeholder='{ "supplier": "Acme" }'
      />
    );
  }

  return (
    <Input
      className="rounded-xl"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.type === "number" ? "10" : field.type === "date" ? "" : `Enter ${field.label.toLowerCase()}`}
    />
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReadinessLine({ ready, label }: { ready: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 p-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        {ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
        {label}
      </span>
      <Badge variant={ready ? "default" : "secondary"} className="rounded-full">{ready ? "Ready" : "Needed"}</Badge>
    </div>
  );
}

function SideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2.5">
      <span className="text-white/70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function calculateMargin(price: number, cost?: number) {
  if (!price || !cost) return "—";
  return `${Math.round(((price - cost) / price) * 100)}%`;
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
