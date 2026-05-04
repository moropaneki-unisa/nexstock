"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import {
  ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";
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

type MetadataFieldType = "text" | "number" | "boolean" | "date";

type MetadataField = {
  key: string;
  label: string;
  type: MetadataFieldType;
  value: string;
};

type FormValues = {
  name: string;
  category?: string;
  description?: string;
  price: number;
  cost?: number | string;
  quantity: number;
  lowStockLevel: number;
  metadataFields: MetadataField[];
};

type ImagePreview = {
  id: string;
  name: string;
  url: string;
};

type ProductFormProps = {
  product?: Product;
  mode?: "create" | "edit";
};

export function ProductForm({ product, mode = "create" }: ProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(product);

  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImagePreview[]>(() =>
    (product?.images ?? []).map((url, index) => ({
      id: `existing-${index}-${url}`,
      name: `Image ${index + 1}`,
      url,
    }))
  );

  const defaultMetadataFields = useMemo(
    () => metadataToFields(product?.metadata),
    [product?.metadata]
  );

  const {
    register,
    handleSubmit,
    control,
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
      metadataFields: defaultMetadataFields,
    },
  });

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
      metadataFields: metadataToFields(product.metadata),
    });

    setImages(
      (product.images ?? []).map((url, index) => ({
        id: `existing-${index}-${url}`,
        name: `Image ${index + 1}`,
        url,
      }))
    );
  }, [product, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "metadataFields",
  });

  const metadataFields = watch("metadataFields");

  const metadataFieldCount = useMemo(() => {
    return metadataFields?.filter((field) => field.key || field.label || field.value)
      .length;
  }, [metadataFields]);

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;

    const uploaded = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<ImagePreview>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve({
                id: crypto.randomUUID(),
                name: file.name,
                url: reader.result as string,
              });
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    setImages((prev) => [...prev, ...uploaded]);
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((image) => image.id !== id));
  }

  async function onSubmit(values: FormValues) {
    setError(null);

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
      metadata: fieldsToMetadata(values.metadataFields),
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
    } catch (err: any) {
      setError(err.message ?? `Failed to ${isEdit ? "update" : "create"} product`);
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
              <Input
                placeholder="Classic cotton t-shirt"
                {...register("name", { required: true })}
              />
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
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="299.99"
                {...register("price", { required: true })}
              />
            </Field>

            <Field label="Cost">
              <Input
                type="number"
                step="0.01"
                min={0}
                placeholder="120.00"
                {...register("cost")}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              Set stock quantity and the low-stock threshold used by the dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Quantity" required>
              <Input
                type="number"
                min={0}
                placeholder="0"
                {...register("quantity", { required: true })}
              />
            </Field>

            <Field label="Low stock alert" required>
              <Input
                type="number"
                min={0}
                placeholder="5"
                {...register("lowStockLevel", { required: true })}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Upload product images. They are sent as URLs or image data through the API images field.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition hover:bg-muted/50">
            <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to upload product images</span>
            <span className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, WEBP. You can select multiple files.
            </span>

            <Input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleImageUpload(event.target.files)}
            />
          </label>

          {images.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative overflow-hidden rounded-xl border bg-muted/30"
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-40 w-full object-cover transition group-hover:scale-105"
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 shadow-sm transition hover:bg-background"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="border-t bg-background p-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {image.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>
                Add flexible product attributes such as color, material, warranty, supplier, or launch date.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  key: "",
                  label: "",
                  type: "text",
                  value: "",
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add metadata
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No metadata yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add optional fields when the default product fields are not enough.
              </p>

              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() =>
                  append({
                    key: "",
                    label: "",
                    type: "text",
                    value: "",
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first field
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  {metadataFieldCount} metadata field{metadataFieldCount === 1 ? "" : "s"} added
                </p>

                <Badge variant="outline">Optional</Badge>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Metadata field #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        Metadata is saved directly to the product metadata object.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Label">
                      <Input
                        placeholder="Supplier name"
                        {...register(`metadataFields.${index}.label` as const, {
                          onChange: (event) => {
                            const generatedKey = generateKeyFromLabel(event.target.value);
                            setValue(`metadataFields.${index}.key`, generatedKey);
                          },
                        })}
                      />
                    </Field>

                    <Field label="Generated key">
                      <Input
                        value={metadataFields?.[index]?.key || ""}
                        readOnly
                        className="bg-muted text-muted-foreground"
                        placeholder="supplier_name"
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Type">
                      <Select
                        defaultValue={field.type || "text"}
                        onValueChange={(value: MetadataFieldType) =>
                          setValue(`metadataFields.${index}.type`, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Value">
                      <Input
                        type={metadataFields?.[index]?.type === "date" ? "date" : "text"}
                        placeholder="Acme Supplies"
                        {...register(`metadataFields.${index}.value` as const)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="sticky bottom-4 z-10 border bg-background/95 shadow-lg backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {isEdit ? "Ready to update this product?" : "Ready to create this product?"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Changes will be synced to inventory, activity logs, and webhooks through the API."
                : "The backend will generate the SKU and create the initial inventory log."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/products")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
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

function generateKeyFromLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function metadataToFields(metadata?: Product["metadata"]): MetadataField[] {
  if (!metadata || typeof metadata !== "object") return [];

  return Object.entries(metadata).map(([key, value]) => ({
    key,
    label: key
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || key,
    type: inferMetadataType(value),
    value: value == null ? "" : String(value),
  }));
}

function fieldsToMetadata(fields: MetadataField[]) {
  const metadata = fields.reduce<Record<string, unknown>>((acc, field) => {
    const key = field.key || generateKeyFromLabel(field.label);
    if (!key || field.value === "") return acc;

    if (field.type === "number") {
      const value = Number(field.value);
      if (!Number.isNaN(value)) acc[key] = value;
      return acc;
    }

    if (field.type === "boolean") {
      acc[key] = String(field.value).toLowerCase() === "true";
      return acc;
    }

    acc[key] = field.value;
    return acc;
  }, {});

  return Object.keys(metadata).length ? metadata : undefined;
}

function inferMetadataType(value: unknown): MetadataFieldType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  return "text";
}
