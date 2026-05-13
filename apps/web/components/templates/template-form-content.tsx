"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  BoldIcon,
  CodeIcon,
  EyeIcon,
  ItalicIcon,
  Loader2Icon,
  SaveIcon,
  SearchIcon,
  TypeIcon,
  UnderlineIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type DocumentTemplate = {
  id: string
  name: string
  type: string
  description?: string | null
  recipientEmailTemplate?: string | null
  subjectTemplate?: string | null
  htmlTemplate: string
  emailTemplate?: string | null
  isDefault: boolean
  isActive: boolean
}

type PreviewResult = { to?: string | null; subject: string; html: string; email?: string | null }
type ApiAlert = { variant: "default" | "destructive"; title: string; description: string } | null
type FieldToken = { label: string; path: string; group: string; description?: string }

type FormState = {
  name: string
  type: string
  description: string
  recipientEmailTemplate: string
  subjectTemplate: string
  htmlTemplate: string
  emailTemplate: string
  isDefault: boolean
  isActive: boolean
}

const modules = [
  { value: "purchase_orders", label: "Purchase Orders", description: "Purchase order PDFs and supplier emails" },
  { value: "quotes", label: "Quotes", description: "Customer quote PDFs and quote emails" },
  { value: "invoices", label: "Invoices", description: "Sales or supplier invoice documents" },
  { value: "statements", label: "Statements", description: "Customer account statements" },
  { value: "products", label: "Products", description: "Product documents and product emails" },
  { value: "suppliers", label: "Suppliers", description: "Supplier documents and supplier emails" },
  { value: "customers", label: "Customers", description: "Customer documents and emails" },
]

const commonFields: FieldToken[] = [
  { group: "Organization", label: "Organization name", path: "organization.name" },
  { group: "Organization", label: "Organization email", path: "organization.email" },
  { group: "Organization", label: "Organization phone", path: "organization.phone" },
]

const moduleFields: Record<string, FieldToken[]> = {
  purchase_orders: [
    { group: "Supplier", label: "Supplier name", path: "supplier.name" },
    { group: "Supplier", label: "Supplier email", path: "supplier.email" },
    { group: "Supplier", label: "Supplier code", path: "supplier.supplierCode" },
    { group: "Purchase order", label: "PO number", path: "purchaseOrder.poNumber" },
    { group: "Purchase order", label: "Currency", path: "purchaseOrder.currency" },
    { group: "Purchase order", label: "Subtotal", path: "purchaseOrder.subtotal" },
    { group: "Purchase order", label: "Expected date", path: "purchaseOrder.expectedAt" },
    { group: "Purchase order", label: "Notes", path: "purchaseOrder.notes" },
    { group: "Line item", label: "Line product name", path: "product.name", description: "Use inside a lines block" },
    { group: "Line item", label: "Line product SKU", path: "product.sku", description: "Use inside a lines block" },
    { group: "Line item", label: "Quantity ordered", path: "quantityOrdered", description: "Use inside a lines block" },
    { group: "Line item", label: "Unit cost", path: "unitCost", description: "Use inside a lines block" },
    { group: "Line item", label: "Line total", path: "lineTotal", description: "Use inside a lines block" },
  ],
  quotes: [
    { group: "Customer", label: "Customer name", path: "customer.name" },
    { group: "Customer", label: "Customer email", path: "customer.email" },
    { group: "Quote", label: "Quote number", path: "quote.quoteNumber" },
    { group: "Quote", label: "Currency", path: "quote.currency" },
    { group: "Quote", label: "Total", path: "quote.total" },
    { group: "Quote", label: "Valid until", path: "quote.validUntil" },
    { group: "Line item", label: "Product name", path: "product.name", description: "Use inside a lines block" },
    { group: "Line item", label: "Quantity", path: "quantity", description: "Use inside a lines block" },
    { group: "Line item", label: "Unit price", path: "unitPrice", description: "Use inside a lines block" },
    { group: "Line item", label: "Line total", path: "lineTotal", description: "Use inside a lines block" },
  ],
  invoices: [
    { group: "Customer", label: "Customer name", path: "customer.name" },
    { group: "Customer", label: "Customer email", path: "customer.email" },
    { group: "Invoice", label: "Invoice number", path: "invoice.invoiceNumber" },
    { group: "Invoice", label: "Currency", path: "invoice.currency" },
    { group: "Invoice", label: "Total", path: "invoice.total" },
    { group: "Invoice", label: "Due date", path: "invoice.dueDate" },
    { group: "Line item", label: "Product name", path: "product.name", description: "Use inside a lines block" },
    { group: "Line item", label: "Quantity", path: "quantity", description: "Use inside a lines block" },
    { group: "Line item", label: "Unit price", path: "unitPrice", description: "Use inside a lines block" },
    { group: "Line item", label: "Line total", path: "lineTotal", description: "Use inside a lines block" },
  ],
  statements: [
    { group: "Customer", label: "Customer name", path: "customer.name" },
    { group: "Customer", label: "Customer email", path: "customer.email" },
    { group: "Statement", label: "Statement number", path: "statement.statementNumber" },
    { group: "Statement", label: "Period", path: "statement.period" },
    { group: "Statement", label: "Currency", path: "statement.currency" },
    { group: "Statement", label: "Balance", path: "statement.balance" },
  ],
  products: [
    { group: "Product", label: "Product name", path: "product.name" },
    { group: "Product", label: "SKU", path: "product.sku" },
    { group: "Product", label: "Price", path: "product.price" },
    { group: "Product", label: "Quantity", path: "product.quantity" },
  ],
  suppliers: [
    { group: "Supplier", label: "Supplier name", path: "supplier.name" },
    { group: "Supplier", label: "Supplier code", path: "supplier.supplierCode" },
    { group: "Supplier", label: "Supplier email", path: "supplier.email" },
    { group: "Supplier", label: "Supplier phone", path: "supplier.phone" },
  ],
  customers: [
    { group: "Customer", label: "Customer name", path: "customer.name" },
    { group: "Customer", label: "Customer email", path: "customer.email" },
    { group: "Customer", label: "Customer phone", path: "customer.phone" },
  ],
}

const defaultHtml = `<div style="font-family: Arial, sans-serif; color: #111; padding: 32px;">
  <h1>{{purchaseOrder.poNumber}}</h1>
  <p><strong>Supplier:</strong> {{supplier.name}}</p>
  <p><strong>Expected:</strong> {{purchaseOrder.expectedAt}}</p>
  <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
    <thead><tr><th style="border-bottom:1px solid #ddd; text-align:left; padding:8px;">Product</th><th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Qty</th><th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Unit</th><th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Total</th></tr></thead>
    <tbody>{{#lines}}<tr><td style="border-bottom:1px solid #eee; padding:8px;">{{product.name}}</td><td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{quantityOrdered}}</td><td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{unitCost}}</td><td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{lineTotal}}</td></tr>{{/lines}}</tbody>
  </table>
  <h2 style="text-align:right; margin-top:24px;">{{purchaseOrder.currency}} {{purchaseOrder.subtotal}}</h2>
</div>`

const defaultEmail = `Hi {{supplier.name}},

Please find attached {{purchaseOrder.poNumber}}.

Regards,
{{organization.name}}`

const emptyForm: FormState = {
  name: "",
  type: "purchase_orders",
  description: "",
  recipientEmailTemplate: "{{supplier.email}}",
  subjectTemplate: "Document {{purchaseOrder.poNumber}}",
  htmlTemplate: defaultHtml,
  emailTemplate: defaultEmail,
  isDefault: false,
  isActive: true,
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function messageFromError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function fieldsForModule(module: string) {
  return [...commonFields, ...(moduleFields[module] || [])]
}

export function TemplateFormContent({ templateId }: { templateId?: string }) {
  const router = useRouter()
  const editorRef = React.useRef<{ getHtml: () => string }>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [loading, setLoading] = React.useState(Boolean(templateId))
  const [saving, setSaving] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [preview, setPreview] = React.useState<PreviewResult | null>(null)
  const [apiAlert, setApiAlert] = React.useState<ApiAlert>(null)

  React.useEffect(() => {
    async function load() {
      if (!templateId) return
      setLoading(true)
      try {
        const template = await apiFetch<DocumentTemplate>(`/api/document-templates/${templateId}`)
        setForm({
          name: template.name,
          type: template.type || "purchase_orders",
          description: template.description || "",
          recipientEmailTemplate: template.recipientEmailTemplate || "{{supplier.email}}",
          subjectTemplate: template.subjectTemplate || "",
          htmlTemplate: template.htmlTemplate,
          emailTemplate: template.emailTemplate || "",
          isDefault: template.isDefault,
          isActive: template.isActive,
        })
      } catch (err) {
        const message = messageFromError(err, "Template could not load")
        setApiAlert({ variant: "destructive", title: "Template could not load", description: message })
        toast.error("Template could not load", { description: message })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [templateId])

  async function renderPreview() {
    const latestHtml = editorRef.current?.getHtml() || form.htmlTemplate
    setForm((current) => ({ ...current, htmlTemplate: latestHtml }))
    setPreviewing(true)
    setApiAlert(null)
    try {
      const result = await apiFetch<PreviewResult>("/api/document-templates/preview/render", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          htmlTemplate: latestHtml,
          recipientEmailTemplate: form.recipientEmailTemplate,
          subjectTemplate: form.subjectTemplate,
          emailTemplate: form.emailTemplate,
        }),
      })
      setPreview(result)
      setApiAlert({ variant: "default", title: "Preview rendered", description: `Rendered with ${titleCase(form.type)} sample data.` })
      toast.success("Preview rendered", { description: result.to || result.subject })
    } catch (err) {
      const message = messageFromError(err, "Preview failed")
      setApiAlert({ variant: "destructive", title: "Preview failed", description: message })
      toast.error("Preview failed", { description: message })
    } finally {
      setPreviewing(false)
    }
  }

  async function saveTemplate() {
    const latestHtml = editorRef.current?.getHtml() || form.htmlTemplate
    if (!form.name.trim()) return toast.error("Template name is required")
    if (!latestHtml.trim()) return toast.error("Template document is required")
    setSaving(true)
    setApiAlert(null)
    try {
      const payload = { ...form, htmlTemplate: latestHtml }
      const result = templateId
        ? await apiFetch<DocumentTemplate>(`/api/document-templates/${templateId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<DocumentTemplate>("/api/document-templates", { method: "POST", body: JSON.stringify(payload) })
      toast.success(templateId ? "Template updated" : "Template created", { description: result.name })
      router.push("/settings/templates")
    } catch (err) {
      const message = messageFromError(err, "Template could not be saved")
      setApiAlert({ variant: "destructive", title: "Template could not be saved", description: message })
      toast.error("Template could not be saved", { description: message })
    } finally {
      setSaving(false)
    }
  }

  const selectedModule = modules.find((module) => module.value === form.type)
  const fields = fieldsForModule(form.type)

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[720px] rounded-xl" /></div>

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/settings/templates"><ArrowLeftIcon className="size-4" />Templates</Link></Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{templateId ? "Edit template" : "New template"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create reusable templates for quotes, invoices, statements, products, suppliers, and purchase orders.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={renderPreview} disabled={previewing}>{previewing ? <Loader2Icon className="size-4 animate-spin" /> : <EyeIcon className="size-4" />}Preview</Button><Button size="sm" onClick={saveTemplate} disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{templateId ? "Save changes" : "Create template"}</Button></div>
      </div>

      {apiAlert ? (
        <Alert variant={apiAlert.variant}>
          <TriangleAlertIcon className="size-4" />
          <AlertTitle>{apiAlert.title}</AlertTitle>
          <AlertDescription>{apiAlert.description}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Template settings</CardTitle><CardDescription>Select the module first. The editor field picker will use fields from that module.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Default quote" /></label>
              <label className="grid gap-2"><Label>Module</Label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{modules.map((module) => <SelectItem key={module.value} value={module.value}>{module.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">{selectedModule?.description}</p></label>
              <label className="grid gap-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Used when sending invoices to customers" /></label>
              <label className="grid gap-2 md:col-span-2"><Label>Recipient email</Label><Input value={form.recipientEmailTemplate} onChange={(event) => setForm((current) => ({ ...current, recipientEmailTemplate: event.target.value }))} placeholder="{{customer.email}} or {{supplier.email}}" /><p className="text-xs text-muted-foreground">Use the record email placeholder or type a manual address when sending.</p></label>
              <label className="grid gap-2 md:col-span-2"><Label>Email subject template</Label><Input value={form.subjectTemplate} onChange={(event) => setForm((current) => ({ ...current, subjectTemplate: event.target.value }))} /></label>
              <label className="flex items-center gap-3 rounded-lg border bg-muted/15 p-4 text-sm"><Checkbox checked={form.isDefault} onCheckedChange={(checked) => setForm((current) => ({ ...current, isDefault: Boolean(checked) }))} /><span><span className="font-semibold">Default template</span><span className="block text-muted-foreground">Use this as the default for this module.</span></span></label>
              <label className="flex items-center gap-3 rounded-lg border bg-muted/15 p-4 text-sm"><Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: Boolean(checked) }))} /><span><span className="font-semibold">Active</span><span className="block text-muted-foreground">Inactive templates are hidden from sending flows.</span></span></label>
            </CardContent>
          </Card>
          <DocumentHtmlEditor ref={editorRef} value={form.htmlTemplate} onChange={(htmlTemplate) => setForm((current) => ({ ...current, htmlTemplate }))} fields={fields} moduleLabel={selectedModule?.label || titleCase(form.type)} />
          <Card><CardHeader><CardTitle>Email body template</CardTitle><CardDescription>Use the same module fields here manually, or copy placeholders from the PDF editor field picker.</CardDescription></CardHeader><CardContent><Textarea value={form.emailTemplate} onChange={(event) => setForm((current) => ({ ...current, emailTemplate: event.target.value }))} className="min-h-40 font-mono text-xs" /></CardContent></Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-[calc(var(--header-height)+1rem)]">
          <CardHeader><CardTitle>Preview</CardTitle><CardDescription>Preview renders with sample {selectedModule?.label || "module"} data.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Module</p><p className="mt-1 font-medium">{selectedModule?.label || titleCase(form.type)}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">To</p><p className="mt-1 font-medium">{preview?.to || form.recipientEmailTemplate || "Not rendered"}</p></div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p><p className="mt-1 font-medium">{preview?.subject || form.subjectTemplate || "Not rendered"}</p></div>
            {preview?.email ? <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p><pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-card p-3 text-xs text-card-foreground">{preview.email}</pre></div> : null}
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PDF document</p><div className="mt-2 max-h-[520px] overflow-auto rounded-lg border bg-white p-3 text-slate-950 shadow-inner dark:bg-white dark:text-slate-950 [&_*]:text-inherit" dangerouslySetInnerHTML={{ __html: preview?.html || "<p>Click Preview to render the template.</p>" }} /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const DocumentHtmlEditor = React.forwardRef<{ getHtml: () => string }, { value: string; onChange: (value: string) => void; fields: FieldToken[]; moduleLabel: string }>(function DocumentHtmlEditor({ value, onChange, fields, moduleLabel }, ref) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [mode, setMode] = React.useState("document")
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [fieldSearch, setFieldSearch] = React.useState("")

  React.useImperativeHandle(ref, () => ({
    getHtml: () => mode === "document" ? editorRef.current?.innerHTML || value : value,
  }), [mode, value])

  React.useEffect(() => {
    if (mode !== "document") return
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value
  }, [mode, value])

  const filteredFields = React.useMemo(() => {
    const query = fieldSearch.trim().toLowerCase()
    if (!query) return fields
    return fields.filter((field) => [field.label, field.path, field.group, field.description].filter(Boolean).join(" ").toLowerCase().includes(query))
  }, [fieldSearch, fields])

  function syncFromDocument() {
    if (!editorRef.current) return
    onChange(editorRef.current.innerHTML)
  }

  function command(name: string, commandValue?: string) {
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    syncFromDocument()
  }

  function openFieldPicker() {
    setFieldSearch("")
    setPickerOpen(true)
  }

  function insertPlaceholder(path: string) {
    const token = `{{${path}}}`
    if (mode === "html") {
      onChange(`${value}${token}`)
    } else {
      editorRef.current?.focus()
      document.execCommand("insertText", false, token)
      syncFromDocument()
    }
    setPickerOpen(false)
  }

  function onEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "#") {
      event.preventDefault()
      openFieldPicker()
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>PDF document template</CardTitle>
            <CardDescription>Type <span className="font-mono">#</span> in the document to open searchable {moduleLabel} fields. Use <span className="font-mono">{{"{{#lines}}"}}</span>...<span className="font-mono">{{"{{/lines}}"}}</span> for repeated line items.</CardDescription>
          </div>
          <Tabs value={mode} onValueChange={setMode} className="w-fit">
            <TabsList>
              <TabsTrigger value="document"><TypeIcon className="size-4" />Document</TabsTrigger>
              <TabsTrigger value="html"><CodeIcon className="size-4" />HTML</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => command("bold")} disabled={mode !== "document"}><BoldIcon className="size-4" /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => command("italic")} disabled={mode !== "document"}><ItalicIcon className="size-4" /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => command("underline")} disabled={mode !== "document"}><UnderlineIcon className="size-4" /></Button>
          <Button type="button" variant="outline" size="sm" onClick={() => command("formatBlock", "H1")} disabled={mode !== "document"}>H1</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => command("formatBlock", "H2")} disabled={mode !== "document"}>H2</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => command("formatBlock", "P")} disabled={mode !== "document"}>Paragraph</Button>
          <Button type="button" variant="secondary" size="sm" onClick={openFieldPicker}><SearchIcon className="size-4" />Insert field</Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "document" ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncFromDocument}
            onBlur={syncFromDocument}
            onKeyDown={onEditorKeyDown}
            className={cn(
              "min-h-[520px] overflow-auto rounded-xl border bg-white p-8 text-sm leading-6 text-slate-950 shadow-inner outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-white dark:text-slate-950",
              "[&_*]:text-inherit [&_a]:text-blue-700 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_small]:text-slate-600 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border-b [&_th]:border-slate-300 [&_th]:p-2"
            )}
          />
        ) : (
          <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[520px] font-mono text-xs" onKeyDown={(event) => { if (event.key === "#") { event.preventDefault(); openFieldPicker() } }} />
        )}
      </CardContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert {moduleLabel} field</DialogTitle>
            <DialogDescription>Search and choose a dynamic field. It will be inserted as a mail-merge placeholder.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Search fields..." className="pl-9" autoFocus />
            </div>
            <div className="max-h-96 overflow-y-auto rounded-xl border">
              {filteredFields.length ? filteredFields.map((field) => (
                <button key={`${field.group}-${field.path}`} type="button" className="flex w-full items-start justify-between gap-4 border-b p-3 text-left transition hover:bg-muted/50 last:border-b-0" onClick={() => insertPlaceholder(field.path)}>
                  <span>
                    <span className="block font-medium">{field.label}</span>
                    <span className="block text-xs text-muted-foreground">{field.group}{field.description ? ` · ${field.description}` : ""}</span>
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{{`{{${field.path}}}`}}</span>
                </button>
              )) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No fields found.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
})
