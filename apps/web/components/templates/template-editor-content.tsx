"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BoldIcon, CodeIcon, ExternalLinkIcon, FileTextIcon, ItalicIcon, Loader2Icon, MailIcon, SaveIcon, SearchIcon, Settings2Icon, TableIcon, TypeIcon, UnderlineIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type TemplateKind = "pdf" | "email"
type Template = { id: string; name: string; type: string; kind?: TemplateKind | null; description?: string | null; recipientEmailTemplate?: string | null; subjectTemplate?: string | null; htmlTemplate: string; emailTemplate?: string | null }
type FieldToken = { label: string; path: string; group: string; description?: string }
type PreviewResult = { to?: string | null; subject: string; html: string; email?: string | null }
type TableColumn = { id: string; label: string; token: string; align: "left" | "right"; enabled: boolean }

const modules = [
  { value: "purchase_orders", label: "Purchase Orders" },
  { value: "quotes", label: "Quotes" },
  { value: "invoices", label: "Invoices" },
  { value: "statements", label: "Statements" },
  { value: "products", label: "Products" },
  { value: "suppliers", label: "Suppliers" },
  { value: "customers", label: "Customers" },
]

const defaultPdfHtml = `<div style="font-family: Arial, sans-serif; color: #111; padding: 32px;">
  <h1>{{purchaseOrder.poNumber}}</h1>
  <p><strong>Supplier:</strong> {{supplier.name}}</p>
  <p><strong>Expected:</strong> {{purchaseOrder.expectedAt}}</p>
  <table style="width:100%; border-collapse: collapse; margin-top: 24px;">
    <thead><tr><th style="border-bottom:1px solid #ddd; text-align:left; padding:8px;">Product</th><th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Qty</th><th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Unit</th><th style="border-bottom:1px solid #ddd; text-align:right; padding:8px;">Total</th></tr></thead>
    <tbody>{{#lines}}<tr><td style="border-bottom:1px solid #eee; padding:8px;">{{product.name}}</td><td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{quantityOrdered}}</td><td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{unitCost}}</td><td style="border-bottom:1px solid #eee; padding:8px; text-align:right;">{{lineTotal}}</td></tr>{{/lines}}</tbody>
  </table>
  <h2 style="text-align:right; margin-top:24px;">{{purchaseOrder.currency}} {{purchaseOrder.subtotal}}</h2>
</div>`

const defaultEmailBody = `Hi {{supplier.name}},

Please find attached {{purchaseOrder.poNumber}}.

Regards,
{{organization.name}}`

const defaultTableColumns: TableColumn[] = [
  { id: "product", label: "Product", token: "{{product.name}}", align: "left", enabled: true },
  { id: "sku", label: "SKU", token: "{{product.sku}}", align: "left", enabled: false },
  { id: "qty", label: "Qty", token: "{{quantityOrdered}}", align: "right", enabled: true },
  { id: "unit", label: "Unit cost", token: "{{unitCost}}", align: "right", enabled: true },
  { id: "total", label: "Total", token: "{{lineTotal}}", align: "right", enabled: true },
]

function messageFromError(err: unknown, fallback: string) { return err instanceof Error ? err.message : fallback }
function titleCase(value: string) { return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) }
function groupFields(fields: FieldToken[]) { return fields.reduce<Record<string, FieldToken[]>>((acc, field) => { acc[field.group] = acc[field.group] || []; acc[field.group].push(field); return acc }, {}) }
function pdfDocument(html: string) { return `<!doctype html><html><head><meta charset="utf-8"/><title>PDF Preview</title><style>body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 16px;font-size:13px;color:#475569}.page{width:794px;min-height:1123px;margin:24px auto;background:#fff;color:#111;box-shadow:0 18px 45px rgba(15,23,42,.18);box-sizing:border-box}@media print{.toolbar{display:none}body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}}</style></head><body><div class="toolbar">PDF preview · Press Ctrl+P to print or save as PDF</div><div class="page">${html}</div></body></html>` }
function emailDocument(result: PreviewResult, fallbackBody: string) { return `<!doctype html><html><head><meta charset="utf-8"/><title>Email Preview</title><style>body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#111827}.wrap{max-width:860px;margin:32px auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 18px 45px rgba(15,23,42,.12);overflow:hidden}.head{padding:20px 24px;border-bottom:1px solid #e5e7eb}.label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.value{margin-top:4px;font-weight:600}.body{padding:24px;white-space:pre-wrap;line-height:1.6}</style></head><body><div class="wrap"><div class="head"><div class="label">To</div><div class="value">${result.to || ""}</div><br/><div class="label">Subject</div><div class="value">${result.subject || ""}</div></div><div class="body">${result.email || fallbackBody}</div></div></body></html>` }
function buildLineTable(columns: TableColumn[]) {
  const active = columns.filter((column) => column.enabled)
  const header = active.map((column) => `<th style="border-bottom:1px solid #d1d5db; text-align:${column.align}; padding:10px 8px; font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:#475569;">${column.label}</th>`).join("")
  const row = active.map((column) => `<td style="border-bottom:1px solid #e5e7eb; padding:10px 8px; text-align:${column.align};">${column.token}</td>`).join("")
  return `<table style="width:100%; border-collapse: collapse; margin-top: 24px; font-size:13px;">
  <thead><tr>${header}</tr></thead>
  <tbody>{{#lines}}<tr>${row}</tr>{{/lines}}</tbody>
</table>`
}

export function TemplateEditorContent({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  const router = useRouter()
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRangeRef = React.useRef<Range | null>(null)
  const [template, setTemplate] = React.useState<Template | null>(null)
  const [templateKind, setTemplateKind] = React.useState<TemplateKind>(kind)
  const [name, setName] = React.useState(kind === "email" ? "New email template" : "New PDF template")
  const [module, setModule] = React.useState("purchase_orders")
  const [description, setDescription] = React.useState("")
  const [fields, setFields] = React.useState<FieldToken[]>([])
  const [mode, setMode] = React.useState("document")
  const [fieldSearch, setFieldSearch] = React.useState("")
  const [html, setHtml] = React.useState(defaultPdfHtml)
  const [emailBody, setEmailBody] = React.useState(defaultEmailBody)
  const [subject, setSubject] = React.useState("Document {{purchaseOrder.poNumber}}")
  const [to, setTo] = React.useState("{{supplier.email}}")
  const [tableBuilderOpen, setTableBuilderOpen] = React.useState(false)
  const [tableColumns, setTableColumns] = React.useState<TableColumn[]>(defaultTableColumns)
  const [loading, setLoading] = React.useState(Boolean(templateId))
  const [saving, setSaving] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)

  React.useEffect(() => {
    async function loadTemplate() {
      if (!templateId) return
      setLoading(true)
      try {
        const data = await apiFetch<Template>(`/api/document-templates/${templateId}`)
        setTemplate(data)
        setTemplateKind((data.kind || "pdf") as TemplateKind)
        setName(data.name || "Untitled template")
        setModule(data.type || "purchase_orders")
        setDescription(data.description || "")
        setHtml(data.htmlTemplate || defaultPdfHtml)
        setEmailBody(data.emailTemplate || defaultEmailBody)
        setSubject(data.subjectTemplate || "")
        setTo(data.recipientEmailTemplate || "")
      } catch (err) {
        toast.error("Template editor could not load", { description: messageFromError(err, "Load failed") })
      } finally { setLoading(false) }
    }
    void loadTemplate()
  }, [templateId])

  React.useEffect(() => {
    async function loadFields() {
      try { setFields(await apiFetch<FieldToken[]>(`/api/document-templates/fields?module=${encodeURIComponent(module)}`)) }
      catch (err) { toast.error("Could not load fields", { description: messageFromError(err, "Fields failed") }) }
    }
    void loadFields()
  }, [module])

  React.useEffect(() => {
    if (mode !== "document" || templateKind !== "pdf") return
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html
  }, [html, mode, templateKind])

  const filteredFields = React.useMemo(() => {
    const query = fieldSearch.trim().toLowerCase()
    if (!query) return fields
    return fields.filter((field) => [field.label, field.path, field.group, field.description].filter(Boolean).join(" ").toLowerCase().includes(query))
  }, [fieldSearch, fields])
  const groupedFields = React.useMemo(() => groupFields(filteredFields), [filteredFields])
  const closeHref = templateKind === "email" ? "/settings/templates/email" : "/settings/templates/pdf"

  function saveSelection() {
    if (mode !== "document" || templateKind !== "pdf") return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return
    const range = selection.getRangeAt(0)
    if (editorRef.current.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange()
  }

  function syncHtml() {
    if (!editorRef.current) return html
    const next = editorRef.current.innerHTML
    setHtml(next)
    saveSelection()
    return next
  }

  function command(name: string, commandValue?: string) {
    if (mode !== "document" || templateKind !== "pdf") return
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    syncHtml()
  }

  function insertHtmlSnippet(snippet: string, label: string) {
    if (templateKind === "email") {
      setEmailBody((current) => `${current}\n${snippet}`)
      toast.success(`${label} inserted`)
      return
    }
    if (mode === "html") {
      setHtml((current) => `${current}\n${snippet}`)
      toast.success(`${label} inserted`)
      return
    }
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    const range = savedRangeRef.current
    if (selection && range && editor.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges(); selection.addRange(range); range.deleteContents()
      const wrapper = document.createElement("div")
      wrapper.innerHTML = snippet
      const fragment = document.createDocumentFragment()
      let lastNode: ChildNode | null = null
      while (wrapper.firstChild) lastNode = fragment.appendChild(wrapper.firstChild)
      range.insertNode(fragment)
      if (lastNode) {
        range.setStartAfter(lastNode)
        range.setEndAfter(lastNode)
        selection.removeAllRanges(); selection.addRange(range); savedRangeRef.current = range.cloneRange()
      }
    } else editor.insertAdjacentHTML("beforeend", snippet)
    syncHtml()
    toast.success(`${label} inserted`)
  }

  function insertField(path: string) {
    const token = `{{${path}}}`
    if (templateKind === "email") {
      setEmailBody((current) => `${current}${token}`)
      toast.success("Field inserted", { description: token })
      return
    }
    if (mode === "html") {
      setHtml((current) => `${current}${token}`)
      toast.success("Field inserted", { description: token })
      return
    }
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    const range = savedRangeRef.current
    if (selection && range && editor.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges(); selection.addRange(range); range.deleteContents()
      const node = document.createTextNode(token)
      range.insertNode(node); range.setStartAfter(node); range.setEndAfter(node)
      selection.removeAllRanges(); selection.addRange(range); savedRangeRef.current = range.cloneRange()
    } else editor.append(document.createTextNode(token))
    syncHtml()
    toast.success("Field inserted", { description: token })
  }

  function insertBuiltTable() {
    if (!tableColumns.some((column) => column.enabled)) return toast.error("Select at least one table column")
    insertHtmlSnippet(buildLineTable(tableColumns), "Line table")
    setTableBuilderOpen(false)
  }

  async function save() {
    const latestHtml = templateKind === "pdf" && mode === "document" ? syncHtml() : html
    if (!name.trim()) return toast.error("Template name is required")
    setSaving(true)
    try {
      const payload = { name, type: module, kind: templateKind, description, htmlTemplate: latestHtml, emailTemplate: emailBody, subjectTemplate: subject, recipientEmailTemplate: to, isActive: true }
      if (template?.id) {
        const updated = await apiFetch<Template>(`/api/document-templates/${template.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        setTemplate(updated)
        toast.success("Template saved", { description: updated.name })
      } else {
        const created = await apiFetch<Template>("/api/document-templates", { method: "POST", body: JSON.stringify(payload) })
        setTemplate(created)
        toast.success("Template created", { description: created.name })
        router.replace(`/settings/templates/${created.id}/editor`)
      }
    } catch (err) {
      toast.error("Template could not be saved", { description: messageFromError(err, "Save failed") })
    } finally { setSaving(false) }
  }

  async function renderPreview() {
    const latestHtml = templateKind === "pdf" && mode === "document" ? syncHtml() : html
    setPreviewing(true)
    try {
      const result = await apiFetch<PreviewResult>("/api/document-templates/preview/render", { method: "POST", body: JSON.stringify({ type: module, kind: templateKind, htmlTemplate: latestHtml, emailTemplate: emailBody, subjectTemplate: subject, recipientEmailTemplate: to }) })
      const doc = templateKind === "pdf" ? pdfDocument(result.html || latestHtml) : emailDocument(result, emailBody)
      const blob = new Blob([doc], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
      toast.success(templateKind === "pdf" ? "PDF preview opened" : "Email preview opened", { description: result.subject })
    } catch (err) {
      toast.error("Preview failed", { description: messageFromError(err, "Preview failed") })
    } finally { setPreviewing(false) }
  }

  const fieldsPanel = (
    <Card className="border-sidebar-border bg-sidebar-accent/30 shadow-none lg:border-border lg:bg-card">
      <CardHeader className="p-3">
        <CardTitle className="text-sm">Fields</CardTitle>
        <CardDescription>Click a field to insert it into the template.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 p-3 pt-0">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Search fields..." className="pl-9" />
        </div>
        <div className="grid max-h-[calc(100vh-13rem)] gap-4 overflow-y-auto pr-1">
          {Object.entries(groupedFields).map(([group, items]) => (
            <div key={group} className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
              {items.map((field) => (
                <button key={`${field.group}-${field.path}`} type="button" onClick={() => insertField(field.path)} className="rounded-lg border bg-background p-3 text-left text-foreground transition hover:bg-muted/50">
                  <span className="block text-sm font-medium">{field.label}</span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">{`{{${field.path}}}`}</span>
                  {field.description ? <span className="mt-1 block text-xs text-muted-foreground">{field.description}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-muted/20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="grid min-h-screen bg-muted/30 lg:grid-cols-[20rem_minmax(0,1fr)_22rem]">
      <aside className="border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">{templateKind === "email" ? <MailIcon className="size-4" /> : <FileTextIcon className="size-4" />}</div>
          <div><p className="text-sm font-semibold">{templateKind === "email" ? "Email editor" : "PDF editor"}</p><p className="text-xs text-sidebar-foreground/70">Template workspace</p></div>
        </div>
        <div className="grid max-h-[calc(100vh-4rem)] gap-3 overflow-y-auto p-4">
          <div className="rounded-lg border bg-sidebar-accent/40 p-3"><p className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">Template</p><p className="mt-1 text-sm font-medium">{name || "Untitled"}</p><p className="text-xs text-sidebar-foreground/70">{titleCase(module)}</p></div>
          <Card className="border-sidebar-border bg-sidebar-accent/30 shadow-none"><CardHeader className="p-3"><CardTitle className="flex items-center gap-2 text-sm"><Settings2Icon className="size-4" />Setup</CardTitle></CardHeader><CardContent className="grid gap-3 p-3 pt-0"><label className="grid gap-1"><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="grid gap-1"><Label>Module</Label><Select value={module} onValueChange={setModule}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{modules.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" /></label></CardContent></Card>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div><p className="text-xs text-muted-foreground">{titleCase(module)} · {templateKind.toUpperCase()} template</p><h1 className="font-heading text-lg font-semibold tracking-tight">{name}</h1></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={renderPreview} disabled={previewing}>{previewing ? <Loader2Icon className="size-4 animate-spin" /> : <ExternalLinkIcon className="size-4" />}Preview</Button><Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}Save</Button><Button asChild variant="outline" size="sm"><Link href={closeHref}><XIcon className="size-4" />Close</Link></Button></div>
          </div>
          <div className="flex flex-wrap items-stretch gap-0 border-t bg-card px-2 py-2 lg:px-4">
            {templateKind === "pdf" ? <RibbonGroup label="Mode"><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="document"><TypeIcon className="size-4" />Document</TabsTrigger><TabsTrigger value="html"><CodeIcon className="size-4" />HTML</TabsTrigger></TabsList></Tabs></RibbonGroup> : null}
            {templateKind === "pdf" ? <RibbonGroup label="Insert"><Button variant="ghost" size="sm" onClick={() => insertHtmlSnippet("<p>New paragraph</p>", "Paragraph")}>Paragraph</Button><Button variant="ghost" size="sm" onClick={() => insertHtmlSnippet("<div style='height:24px'></div>", "Spacer")}>Spacer</Button></RibbonGroup> : null}
            {templateKind === "pdf" ? <RibbonGroup label="Font"><Button variant="ghost" size="sm" onClick={() => command("bold")} disabled={mode !== "document"}><BoldIcon className="size-4" /></Button><Button variant="ghost" size="sm" onClick={() => command("italic")} disabled={mode !== "document"}><ItalicIcon className="size-4" /></Button><Button variant="ghost" size="sm" onClick={() => command("underline")} disabled={mode !== "document"}><UnderlineIcon className="size-4" /></Button></RibbonGroup> : null}
            {templateKind === "pdf" ? <RibbonGroup label="Styles"><Button variant="ghost" size="sm" onClick={() => command("formatBlock", "H1")} disabled={mode !== "document"}>H1</Button><Button variant="ghost" size="sm" onClick={() => command("formatBlock", "H2")} disabled={mode !== "document"}>H2</Button><Button variant="ghost" size="sm" onClick={() => command("formatBlock", "P")} disabled={mode !== "document"}>Body</Button></RibbonGroup> : null}
            {templateKind === "pdf" ? <RibbonGroup label="Tables"><Button variant="ghost" size="sm" onClick={() => setTableBuilderOpen(true)}><TableIcon className="size-4" />Line table builder</Button></RibbonGroup> : null}
            <RibbonGroup label="Fields"><Button variant="ghost" size="sm" onClick={() => setFieldSearch("")}>Browse fields</Button><Button variant="ghost" size="sm" onClick={() => insertField(templateKind === "email" ? "supplier.email" : "organization.name")}>Quick field</Button></RibbonGroup>
            <RibbonGroup label="View"><Button variant="ghost" size="sm" onClick={renderPreview} disabled={previewing}><ExternalLinkIcon className="size-4" />Preview tab</Button></RibbonGroup>
          </div>
        </header>

        <main className="p-0">
          {templateKind === "pdf" ? (
            <div className="bg-muted p-0">
              {mode === "document" ? <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={syncHtml} onBlur={syncHtml} onKeyUp={saveSelection} onMouseUp={saveSelection} className={cn("mx-auto min-h-[calc(100vh-9rem)] w-full max-w-[900px] overflow-auto bg-white p-8 text-sm leading-6 text-slate-950 shadow-xl outline-none dark:bg-white dark:text-slate-950", "[&_*]:text-inherit [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border-b [&_th]:border-slate-300 [&_th]:p-2")} /> : <Textarea value={html} onChange={(event) => setHtml(event.target.value)} className="min-h-[calc(100vh-9rem)] rounded-none border-0 font-mono text-xs" />}
            </div>
          ) : (
            <div className="mx-auto grid max-w-4xl gap-4 p-6">
              <Card><CardContent className="grid gap-4 p-6"><label className="grid gap-2"><Label>To</Label><Input value={to} onChange={(event) => setTo(event.target.value)} /></label><label className="grid gap-2"><Label>Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="grid gap-2"><Label>Body</Label><Textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} className="min-h-[560px]" /></label></CardContent></Card>
            </div>
          )}
        </main>
      </div>

      <aside className="border-l bg-background p-3 lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden">
        <div className="lg:sticky lg:top-3">
          {fieldsPanel}
        </div>
      </aside>

      <Dialog open={tableBuilderOpen} onOpenChange={setTableBuilderOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Line table builder</DialogTitle><DialogDescription>Choose the columns and rename the table headings before inserting the repeating line-items table.</DialogDescription></DialogHeader>
          <div className="grid gap-4"><div className="overflow-hidden rounded-xl border"><div className="grid grid-cols-[2rem_1fr_1fr_7rem] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span /><span>Heading</span><span>Field</span><span>Align</span></div>{tableColumns.map((column) => <div key={column.id} className="grid grid-cols-[2rem_1fr_1fr_7rem] items-center gap-2 border-b px-3 py-2 last:border-b-0"><Checkbox checked={column.enabled} onCheckedChange={(checked) => setTableColumns((current) => current.map((item) => item.id === column.id ? { ...item, enabled: Boolean(checked) } : item))} /><Input value={column.label} onChange={(event) => setTableColumns((current) => current.map((item) => item.id === column.id ? { ...item, label: event.target.value } : item))} /><Input value={column.token} onChange={(event) => setTableColumns((current) => current.map((item) => item.id === column.id ? { ...item, token: event.target.value } : item))} className="font-mono text-xs" /><Select value={column.align} onValueChange={(value: "left" | "right") => setTableColumns((current) => current.map((item) => item.id === column.id ? { ...item, align: value } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></div>)}</div><div className="rounded-xl border bg-white p-4 text-slate-950 shadow-inner dark:bg-white dark:text-slate-950" dangerouslySetInnerHTML={{ __html: buildLineTable(tableColumns) }} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setTableBuilderOpen(false)}>Cancel</Button><Button onClick={insertBuiltTable}><TableIcon className="size-4" />Insert table</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mr-2 flex min-h-14 flex-col justify-between border-r pr-2 last:border-r-0"><div className="flex flex-wrap items-center gap-1">{children}</div><p className="mt-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p></div>
}
