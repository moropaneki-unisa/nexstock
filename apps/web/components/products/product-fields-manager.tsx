"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type CustomFieldType = "text" | "number" | "boolean" | "select" | "date" | "json";

type ProductField = {
  id: string;
  organizationId: string;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
  defaultValue?: unknown;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FieldFormState = {
  label: string;
  type: CustomFieldType;
  required: boolean;
  optionsText: string;
  defaultValue: string;
  order: number;
  isActive: boolean;
};

const emptyForm: FieldFormState = {
  label: "",
  type: "text",
  required: false,
  optionsText: "",
  defaultValue: "",
  order: 0,
  isActive: true,
};

export function ProductFieldsManager() {
  const [fields, setFields] = useState<ProductField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<ProductField | null>(null);
  const [form, setForm] = useState<FieldFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const activeFields = useMemo(
    () => fields.filter((field) => field.isActive),
    [fields]
  );

  const inactiveFields = useMemo(
    () => fields.filter((field) => !field.isActive),
    [fields]
  );

  useEffect(() => {
    loadFields();
  }, []);

  async function loadFields() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<ProductField[]>("/api/product-fields");
      setFields(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load product fields");
    } finally {
      setIsLoading(false);
    }
  }

  function generateKeyFromLabel(value: string) {
    return value
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "");
  }

  function openCreateDialog() {
    setEditingField(null);
    setForm({
      ...emptyForm,
      order: fields.length + 1,
    });
    setError(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(field: ProductField) {
    setEditingField(field);
    setForm({
      label: field.label,
      type: field.type,
      required: field.required,
      optionsText: field.options?.join("\n") ?? "",
      defaultValue:
        field.defaultValue === undefined || field.defaultValue === null
          ? ""
          : typeof field.defaultValue === "object"
            ? JSON.stringify(field.defaultValue, null, 2)
            : String(field.defaultValue),
      order: field.order,
      isActive: field.isActive,
    });
    setError(null);
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    setError(null);

    const label = form.label.trim();
    const key = generateKeyFromLabel(label);

    if (!label) {
      setError("Field label is required");
      return;
    }

    if (!key) {
      setError("Field label must contain at least one valid character");
      return;
    }

    const options = form.optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (form.type === "select" && options.length === 0) {
      setError("Select fields require at least one option");
      return;
    }

    let defaultValue: unknown = undefined;

    try {
      defaultValue = parseDefaultValue(form.type, form.defaultValue);
    } catch (err: any) {
      setError(err.message ?? "Invalid default value");
      return;
    }

    const payload = {
      label,
      type: form.type,
      required: form.required,
      options,
      defaultValue,
      order: Number(form.order) || 0,
      isActive: form.isActive,
    };

    setIsSaving(true);

    try {
      if (editingField) {
        await apiFetch(`/api/product-fields/${editingField.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/product-fields", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsDialogOpen(false);
      await loadFields();
    } catch (err: any) {
      setError(err.message ?? "Failed to save product field");
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateField(field: ProductField) {
    const confirmed = window.confirm(
      `Deactivate "${field.label}"? Existing product values will be preserved.`
    );

    if (!confirmed) return;

    setError(null);

    try {
      await apiFetch(`/api/product-fields/${field.id}`, {
        method: "DELETE",
      });

      await loadFields();
    } catch (err: any) {
      setError(err.message ?? "Failed to deactivate product field");
    }
  }

  async function reactivateField(field: ProductField) {
    setError(null);

    try {
      await apiFetch(`/api/product-fields/${field.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          isActive: true,
        }),
      });

      await loadFields();
    } catch (err: any) {
      setError(err.message ?? "Failed to reactivate product field");
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total fields"
          value={fields.length}
          description="All schema fields created"
        />
        <SummaryCard
          title="Active fields"
          value={activeFields.length}
          description="Shown on product forms"
        />
        <SummaryCard
          title="Inactive fields"
          value={inactiveFields.length}
          description="Hidden but preserved"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Organization product schema
              </CardTitle>
              <CardDescription>
                These custom fields will automatically appear when creating or
                editing products.
              </CardDescription>
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add field
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading product fields...
              </div>
            </div>
          ) : fields.length === 0 ? (
            <EmptyState onCreate={openCreateDialog} />
          ) : (
            <div className="space-y-6">
              <FieldSection
                title="Active fields"
                description="These fields are inherited by products."
                fields={activeFields}
                emptyMessage="No active fields yet."
                onEdit={openEditDialog}
                onDeactivate={deactivateField}
                onReactivate={reactivateField}
              />

              {inactiveFields.length > 0 && (
                <>
                  <Separator />

                  <FieldSection
                    title="Inactive fields"
                    description="These fields are hidden from product forms, but old values remain saved."
                    fields={inactiveFields}
                    emptyMessage="No inactive fields."
                    onEdit={openEditDialog}
                    onDeactivate={deactivateField}
                    onReactivate={reactivateField}
                  />
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Edit product field" : "Create product field"}
            </DialogTitle>
            <DialogDescription>
              Define a field once and every product will inherit it from this
              organization schema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Label" required>
                <Input
                  value={form.label}
                  placeholder="Car Keys"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      label: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Generated key">
                <Input
                  value={generateKeyFromLabel(form.label)}
                  readOnly
                  placeholder="Car_Keys"
                  className="bg-muted text-muted-foreground"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Type" required>
                <Select
                  value={form.type}
                  onValueChange={(value: CustomFieldType) =>
                    setForm((prev) => ({
                      ...prev,
                      type: value,
                      optionsText:
                        value === "select" ? prev.optionsText : "",
                    }))
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
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Display order">
                <Input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      order: Number(event.target.value),
                    }))
                  }
                />
              </Field>
            </div>

            {form.type === "select" && (
              <Field label="Options" required>
                <Textarea
                  value={form.optionsText}
                  placeholder={"Small\nMedium\nLarge"}
                  className="min-h-28 resize-none"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      optionsText: event.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Add one option per line.
                </p>
              </Field>
            )}

            <Field label="Default value">
              {form.type === "boolean" ? (
                <Select
                  value={form.defaultValue || ""}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      defaultValue: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No default value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : form.type === "json" ? (
                <Textarea
                  value={form.defaultValue}
                  placeholder='{ "example": true }'
                  className="min-h-28 resize-none font-mono text-sm"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      defaultValue: event.target.value,
                    }))
                  }
                />
              ) : (
                <Input
                  type={form.type === "number" ? "number" : form.type === "date" ? "date" : "text"}
                  value={form.defaultValue}
                  placeholder={getDefaultPlaceholder(form.type)}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      defaultValue: event.target.value,
                    }))
                  }
                />
              )}
            </Field>

            <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Product creation must provide this value.
                  </p>
                </div>
                <Switch
                  checked={form.required}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, required: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this field on product forms.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button type="button" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingField ? (
                "Save changes"
              ) : (
                "Create field"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <SlidersHorizontal className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <Settings2 className="h-8 w-8" />
      </div>

      <h3 className="mt-4 text-lg font-semibold">No product fields yet</h3>

      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Create custom fields like Is Active, Brand, Color, Material, Warranty
        Months, or Supplier. Products will inherit them automatically.
      </p>

      <Button className="mt-5" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create first field
      </Button>
    </div>
  );
}

function FieldSection({
  title,
  description,
  fields,
  emptyMessage,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  title: string;
  description: string;
  fields: ProductField[];
  emptyMessage: string;
  onEdit: (field: ProductField) => void;
  onDeactivate: (field: ProductField) => void;
  onReactivate: (field: ProductField) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3">
          {fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              onReactivate={onReactivate}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FieldRow({
  field,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  field: ProductField;
  onEdit: (field: ProductField) => void;
  onDeactivate: (field: ProductField) => void;
  onReactivate: (field: ProductField) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-background p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{field.label}</p>

          <Badge variant={field.isActive ? "default" : "secondary"}>
            {field.isActive ? "Active" : "Inactive"}
          </Badge>

          {field.required && <Badge variant="destructive">Required</Badge>}

          <Badge variant="outline">{field.type}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Key: {field.key}</span>
          <span>Order: {field.order}</span>
          {field.options?.length > 0 && (
            <span>Options: {field.options.join(", ")}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!field.isActive && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onReactivate(field)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Reactivate
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(field)}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>

        {field.isActive && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDeactivate(field)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deactivate
          </Button>
        )}
      </div>
    </div>
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

function parseDefaultValue(type: CustomFieldType, rawValue: string) {
  const value = rawValue.trim();

  if (!value) return undefined;

  if (type === "number") {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      throw new Error("Default value must be a valid number");
    }

    return numberValue;
  }

  if (type === "boolean") {
    if (value !== "true" && value !== "false") {
      throw new Error("Default value must be true or false");
    }

    return value === "true";
  }

  if (type === "json") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("Default value must be valid JSON");
    }
  }

  if (type === "date") {
    const date = Date.parse(value);

    if (Number.isNaN(date)) {
      throw new Error("Default value must be a valid date");
    }

    return value;
  }

  return value;
}

function getDefaultPlaceholder(type: CustomFieldType) {
  switch (type) {
    case "text":
      return "Example value";
    case "number":
      return "10";
    case "date":
      return "";
    case "select":
      return "Must match one option";
    default:
      return "";
  }
}