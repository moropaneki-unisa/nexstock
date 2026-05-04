"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import {
  ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
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

type CustomFieldType = "text" | "number" | "boolean" | "select" | "date";

type CustomField = {
  key: string;
  label: string;
  type: CustomFieldType;
  value: string;
};

type FormValues = {
  name: string;
  sku: string;
  category?: string;
  description?: string;
  price: number;
  cost?: number;
  quantity: number;
  lowStockLevel: number;
  customFields: CustomField[];
};

type ImagePreview = {
  id: string;
  name: string;
  url: string;
};

export function ProductForm() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ImagePreview[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      quantity: 0,
      lowStockLevel: 5,
      customFields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "customFields",
  });

  const customFields = watch("customFields");

  const customFieldCount = useMemo(() => {
    return customFields?.filter((field) => field.key || field.label || field.value)
      .length;
  }, [customFields]);

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

 function generateKeyFromLabel(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
}

  async function onSubmit(values: FormValues) {
    setError(null);

    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          sku: values.sku,
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
          customFields: values.customFields
            .filter((field) => field.key && field.label)
            .map((field) => ({
              key: generateKeyFromLabel(field.label),
              label: field.label,
              type: field.type,
              value:
                field.type === "number"
                  ? Number(field.value)
                  : field.type === "boolean"
                    ? field.value === "true"
                    : field.value,
            })),
        }),
      });

      router.push("/products");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Failed to create product");
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
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product name" required>
              <Input
                placeholder="Classic cotton t-shirt"
                {...register("name", { required: true })}
              />
            </Field>

            <Field label="SKU" required>
              <Input
                placeholder="TSHIRT-001"
                className="uppercase"
                {...register("sku", { required: true })}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Category">
              <Input placeholder="Apparel" {...register("category")} />
            </Field>

            <Field label="Low stock alert" required>
              <Input
                type="number"
                min={0}
                placeholder="5"
                {...register("lowStockLevel", { required: true })}
              />
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
              Add the starting stock quantity for this product.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Field label="Initial quantity" required>
              <Input
                type="number"
                min={0}
                placeholder="0"
                {...register("quantity", { required: true })}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            Upload product images. For now these are sent as image data; later you should store them in
            Cloudinary, S3, Supabase Storage, or UploadThing.
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
              <CardTitle>Custom fields</CardTitle>
              <CardDescription>
                Add flexible product attributes like color, material, warranty, supplier, or launch date.
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
              Add custom field
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No custom fields yet</p>
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
                  {customFieldCount} custom field{customFieldCount === 1 ? "" : "s"} added
                </p>

                <Badge variant="outline">Optional</Badge>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border p-4">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Custom field #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        Define the field and its value for this product.
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
                        placeholder="Car Keys"
                        {...register(`customFields.${index}.label` as const, {
                          onChange: (event) => {
                            const generatedKey = generateKeyFromLabel(event.target.value);

                            setValue(`customFields.${index}.key`, generatedKey);
                          },
                        })}
                      />
                    </Field>

                    <Field label="Generated key">
                      <Input
                        value={customFields?.[index]?.key || ""}
                        readOnly
                        className="bg-muted text-muted-foreground"
                        placeholder="Car_Keys"
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Type">
                      <Select
                        defaultValue={field.type || "text"}
                        onValueChange={(value: CustomFieldType) =>
                          setValue(`customFields.${index}.type`, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Value">
                      <Input
                        placeholder="Blue"
                        {...register(`customFields.${index}.value` as const)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="sticky bottom-4 z-10 border bg-background/95 shadow-lg backdrop-blur">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Ready to create this product?</p>
            <p className="text-xs text-muted-foreground">
              You can edit product details, images, and custom fields later.
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
  children: React.ReactNode;
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