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
  TypeIcon,
  UnderlineIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

type DocumentTemplate = {
  id: string
  name: string
  type: string
  description?: string | null
  subjectTemplate?: string | null
  htmlTemplate: string
  emailTemplate?: string | null
  isDefault: boolean
  isActive: boolean
}

type PreviewResult = { subject: string; html: string; email?: string | null }

type FormState = {
  name: string
  type: string
  description: string
  subjectTemplate: string
  htmlTemplate: string
  emailTemplate: string
  isDefault: boolean
  isActive: boolean
}

const placeholderHelp = "Use placeholders like {{purchaseOrder.poNumber}}, {{supplier.name}}, and {{#lines}}...{{/lines}}."
const placeholderTokens = [
  "{{organization.name}}",
  "{{supplier.name}}",
  "{{supplier.supplierCode}}",
  "{{purchaseOrder.poNumber}}",
  "{{purchaseOrder.expectedAt}}",
  "{{purchaseOrder.currency}}",
  "{{purchaseOrder.subtotal}}",
]

const defaultHtml = `<div style="font-family: Arial, sans-serif; color: #111; padding: 32px;">
  <h1>Purchase Order {{purchaseOrder.poNumber}}</h1>
  <p><strong>Supplier:</strong> {{supplier.name}} ({{supplier.supplierCode}})</p>
  <p><strong>Expected:</strong> {{purchaseOrder.expectedAt}}</p>

  <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
    <thead>
      <tr>
        <th style="border-bottom:1px solid #ddd; text-align:left; padding:8px;">Product</th>
        <th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Qty</th>
        <th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Unit cost</th>
        <th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#lines}}
      <tr>
        <td style="border-bottom:1px solid #eee; padding:8px;">{{product.name}}<br><small>{{product.sku}}</small></td>
        <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{quantityOrdered}}</td>
        <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{unitCost}}</td>
        <td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{lineTotal}}</td>
      </tr>
      {{/lines}}
    </tbody>
  </table>

  <h2 style="text-align:right; margin-top:24px;">{{purchaseOrder.currency}} {{purchaseOrder.subtotal}}</h2>
</div>`

const defaultEmail = `Hi {{supplier.name}},

Please find attached purchase order {{purchaseOrder.poNumber}}.

Expected delivery date: {{purchaseOrder.expectedAt}}

Regards,
{{organization.name}}`

const emptyForm: FormState = {
  name: "",
  type: "purchase_order",
  description: "",
  subjectTemplate: "Purchase Order {{purchaseOrder.poNumber}}",
  htmlTemplate: defaultHtml,
  emailTemplate: defaultEmail,
  isDefault: false,
  isActive: true,
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function TemplateFormContent({ templateId }: { templateId?: string }) {
  const router = useRouter()
  const editorRef = React.useRef<{ getHtml: () => string }>(null)
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [loading, setLoading] = React.useState(Boolean(templateId))
  const [saving, setSaving] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [preview, setPreview] = React.useState<PreviewResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function load() {
      if (!templateId) return
      setLoading(true)
      try {
        const template = await apiFetch<DocumentTemplate>(`/api/document-templates/${templateId}`)
        setForm({
          name: template.name,
          type: template.type,
          description: template.description || "",
          subjectTemplate: template.subjectTemplate || "",
          htmlTemplate: template.htmlTemplate,
          emailTemplate: template.emailTemplate || "",
          isDefault: template.isDefault,
          isActive: template.isActive,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Template could not load")
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
    try {
      const result = await apiFetch<PreviewResult>("/api/document-templates/preview", {
        method: "POST",
        body: JSON.stringify({ htmlTemplate: latestHtml, subjectTemplate: form.subjectTemplate, emailTemplate: form.emailTemplate }),
      })
      setPreview(result)
      toast.success("Preview updated")
    } catch (err) {
      toast.error("Could not render preview", { description: err instanceof Error ? err.message : "Preview failed" })
    } finally {
      setPreviewing(false)
    }
  }

  async function saveTemplate() {
    const latestHtml = editorRef.current?.getHtml() || form.htmlTemplate
    if (!form.name.trim()) return toast.error("Template name is required")
    if (!latestHtml.trim()) return toast.error("Template document is required")
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, htmlTemplate: latestHtml }
      const result = templateId
        ? await apiFetch<DocumentTemplate>(`/api/document-templates/${templateId}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch<DocumentTemplate>("/api/document-templates", { method: "POST", body: JSON.stringify(payload) })
      toast.success(templateId ? "Template updated" : "Template created", { description: result.name })
      router.push("/settings/templates")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Template could not be saved"
      setError(message)
      toast.error("Could not save template", { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6"><Skeleton className="h-12 w-72" /><Skeleton className="h-[720px] rounded-xl" /></div>

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link href="/settings/templates"><ArrowLeftIcon className="size-4" />Templates</Link></Button>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{templateId ? "Edit template" : "New template"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create document-style PDF templates and Resend email templates.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={renderPreview} disabled={previewing}>{previewing ? <Loader2Icon className="size-4 animate-spin" /> : <EyeIcon className="size-4" />}Preview</Button><Button size="sm" onClick={saveTemplate} disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{templateId ? "Save changes" : "Create template"}</Button></div>
      </div>

      {error ? <Card className="border-destructive/30 bg-destructive/5"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TriangleAlertIcon className="size-4" />Template error</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="grid gap-4">
          <Card><CardHeader><CardTitle>Template settings</CardTitle><CardDescription>Name, type, subject, and default behavior.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><label className="grid gap-2"><Label>Name</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Default purchase order" /></label><label className="grid gap-2"><Label>Type</Label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["purchase_order", "supplier_invoice", "email"].map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Used when sending purchase orders to suppliers" /></label><label className="grid gap-2 md:col-span-2"><Label>Email subject template</Label><Input value={form.subjectTemplate} onChange={(event) => setForm((current) => ({ ...current, subjectTemplate: event.target.value }))} /></label><label className="flex items-center gap-3 rounded-lg border bg-muted/15 p-4 text-sm"><Checkbox checked={form.isDefault} onCheckedChange={(checked) => setForm((current) => ({ ...current, isDefault: Boolean(checked) }))} /><span><span className="font-semibold">Default template</span><span className="block text-muted-foreground">Use this as the default for this document type.</span></span></label><label className="flex items-center gap-3 rounded-lg border bg-muted/15 p-4 text-sm"><Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: Boolean(checked) }))} /><span><span className="font-semibold">Active</span><span className="block text-muted-foreground">Inactive templates are hidden from future sending flows.</span></span></label></CardContent></Card>
          <DocumentHtmlEditor ref={editorRef} value={form.htmlTemplate} onChange={(htmlTemplate) => setForm((current) => ({ ...current, htmlTemplate }))} />
          <Card><CardHeader><CardTitle>Email body template</CardTitle><CardDescription>This will be rendered before sending through Resend.</CardDescription></CardHeader><CardContent><Textarea value={form.emailTemplate} onChange={(event) => setForm((current) => ({ ...current, emailTemplate: event.target.value }))} className="min-h-40 font-mono text-xs" /></CardContent></Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-[calc(var(--header-height)+1rem)]">
          <CardHeader><CardTitle>Preview</CardTitle><CardDescription>Preview renders with sample purchase order data.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p><p className="mt-1 font-medium">{preview?.subject || form.subjectTemplate || "Not rendered"}</p></div>
            {preview?.email ? <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p><pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-card p-3 text-xs text-card-foreground">{preview.email}</pre></div> : null}
            <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PDF document</p><div className="mt-2 max-h-[520px] overflow-auto rounded-lg border bg-white p-3 text-slate-950 shadow-inner dark:bg-white dark:text-slate-950 [&_*]:text-inherit" dangerouslySetInnerHTML={{ __html: preview?.html || "<p>Click Preview to render the template.</p>" }} /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const DocumentHtmlEditor = React.forwardRef<{ getHtml: () => string }, { value: string; onChange: (value: string) => void }>(function DocumentHtmlEditor({ value, onChange }, ref) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [mode, setMode] = React.useState("document")

  React.useImperativeHandle(ref, () => ({
    getHtml: () => mode === "document" ? editorRef.current?.innerHTML || value : value,
  }), [mode, value])

  React.useEffect(() => {
    if (mode !== "document") return
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value
  }, [mode, value])

  function syncFromDocument() {
    if (!editorRef.current) return
    onChange(editorRef.current.innerHTML)
  }

  function command(name: string, commandValue?: string) {
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    syncFromDocument()
  }

  function insertPlaceholder(token: string) {
    if (mode === "html") {
      onChange(`${value}${token}`)
      return
    }
    editorRef.current?.focus()
    document.execCommand("insertText", false, token)
    syncFromDocument()
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>PDF document template</CardTitle>
            <CardDescription>{placeholderHelp}</CardDescription>
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
        </div>
        <div className="flex flex-wrap gap-2">
          {placeholderTokens.map((token) => (
            <Button key={token} type="button" variant="secondary" size="sm" className="font-mono text-xs" onClick={() => insertPlaceholder(token)}>{token}</Button>
          ))}
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
            className={cn(
              "min-h-[520px] overflow-auto rounded-xl border bg-white p-8 text-sm leading-6 text-slate-950 shadow-inner outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-white dark:text-slate-950",
              "[&_*]:text-inherit [&_a]:text-blue-700 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_small]:text-slate-600 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border-b [&_th]:border-slate-300 [&_th]:p-2"
            )}
          />
        ) : (
          <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[520px] font-mono text-xs" />
        )}
      </CardContent>
    </Card>
  )
})
