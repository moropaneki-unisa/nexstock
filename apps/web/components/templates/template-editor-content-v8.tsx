"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlignLeftIcon,
  AlignRightIcon,
  CodeIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MailIcon,
  SaveIcon,
  SearchIcon,
  TypeIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { WordEditorAdapter } from "@/components/templates/word-editor-adapter"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"

type TemplateKind = "pdf" | "email"
type LogoPosition = "left" | "right"
type Template = {
  id: string
  name: string
  type: string
  kind?: TemplateKind | null
  description?: string | null
  recipientEmailTemplate?: string | null
  subjectTemplate?: string | null
  htmlTemplate: string
  emailTemplate?: string | null
}
type FieldToken = { label: string; path: string; group: string; description?: string }
type PreviewResult = { to?: string | null; subject: string; html: string; email?: string | null }
type UploadResult = { url: string; publicId?: string; originalName?: string }

const modules = ["purchase_orders", "quotes", "invoices", "statements", "products", "suppliers", "customers"].map((value) => ({
  value,
  label: value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
}))

const blankPdf = `<p><br></p>`
const blankEmail = `Hi {{supplier.name}},\n\n`
const headerStart = "<!-- nexstock-header:start -->"
const headerEnd = "<!-- nexstock-header:end -->"
const insertMergeFieldEvent = "nexstock-template-editor-insert-html"

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function stripHeader(html: string) {
  return html.replace(new RegExp(`${headerStart}[\\s\\S]*?${headerEnd}`, "g"), "").trim() || blankPdf
}

function extractHeader(html: string) {
  const block = html.match(new RegExp(`${headerStart}([\\s\\S]*?)${headerEnd}`))?.[1] || ""
  return {
    logoEnabled: block.includes("data-template-logo"),
    addressEnabled: block.includes("data-template-address"),
    logoUrl: block.match(/<img[^>]*src="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&") || "",
    logoPosition: (block.includes("justify-content:flex-end") ? "right" : "left") as LogoPosition,
    body: stripHeader(html),
  }
}

function headerHtml({ logoEnabled, addressEnabled, logoUrl, logoPosition }: { logoEnabled: boolean; addressEnabled: boolean; logoUrl: string; logoPosition: LogoPosition }) {
  if (!logoEnabled && !addressEnabled) return ""
  const logo = logoEnabled ? `<div data-template-logo="true" style="display:flex;justify-content:${logoPosition === "right" && !addressEnabled ? "flex-end" : "flex-start"};align-items:center;min-height:76px;">${logoUrl ? `<img src="${logoUrl.replace(/"/g, "&quot;")}" alt="Logo" style="max-width:170px;max-height:76px;object-fit:contain;display:block;" />` : `<div style="width:170px;height:76px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px;">Logo</div>`}</div>` : ""
  const address = addressEnabled ? `<div data-template-address="true" style="text-align:${logoEnabled ? "right" : logoPosition};font-size:13px;line-height:1.65;color:#475569;padding-top:4px;"><strong style="color:#0f172a;font-size:15px">{{organization.name}}</strong><br>{{organization.address}}<br>{{organization.email}}<br>{{organization.phone}}</div>` : ""
  return `${headerStart}<section data-template-header="true" contenteditable="false" style="display:grid;grid-template-columns:${logoEnabled && addressEnabled ? "minmax(0,1fr) minmax(0,1fr)" : "1fr"};align-items:start;gap:28px;margin:0 0 32px 0;padding:0 0 22px 0;border-bottom:1px solid #e5e7eb;">${logo}${address}</section>${headerEnd}`
}

function groupFields(fields: FieldToken[]) {
  return fields.reduce<Record<string, FieldToken[]>>((acc, field) => {
    acc[field.group] = acc[field.group] || []
    acc[field.group].push(field)
    return acc
  }, {})
}

function pdfDocument(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>PDF Preview</title><style>body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif}.toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 16px;font-size:13px;color:#475569}.page{width:794px;min-height:1123px;margin:24px auto;background:#fff;color:#111;box-shadow:0 18px 45px rgba(15,23,42,.18);box-sizing:border-box;padding:64px 68px}@media print{.toolbar{display:none}body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}}</style></head><body><div class="toolbar">PDF preview · Press Ctrl+P to print or save as PDF</div><div class="page">${html}</div></body></html>`
}

function emailDocument(result: PreviewResult, fallback: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Email Preview</title><style>body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#111827}.wrap{max-width:860px;margin:32px auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 18px 45px rgba(15,23,42,.12);overflow:hidden}.head{padding:20px 24px;border-bottom:1px solid #e5e7eb}.label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.value{margin-top:4px;font-weight:600}.body{padding:24px;white-space:pre-wrap;line-height:1.6}</style></head><body><div class="wrap"><div class="head"><div class="label">To</div><div class="value">${result.to || ""}</div><br/><div class="label">Subject</div><div class="value">${result.subject || ""}</div></div><div class="body">${result.email || fallback}</div></div></body></html>`
}

export function TemplateEditorContentV8({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  const router = useRouter()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [template, setTemplate] = React.useState<Template | null>(null)
  const [templateKind, setTemplateKind] = React.useState<TemplateKind>(kind)
  const [name, setName] = React.useState(kind === "email" ? "New email template" : "New PDF template")
  const [module, setModule] = React.useState("purchase_orders")
  const [description, setDescription] = React.useState("")
  const [mode, setMode] = React.useState("document")
  const [bodyHtml, setBodyHtml] = React.useState(blankPdf)
  const [emailBody, setEmailBody] = React.useState(blankEmail)
  const [subject, setSubject] = React.useState("Document {{purchaseOrder.poNumber}}")
  const [to, setTo] = React.useState("{{supplier.email}}")
  const [logoEnabled, setLogoEnabled] = React.useState(false)
  const [addressEnabled, setAddressEnabled] = React.useState(false)
  const [logoPosition, setLogoPosition] = React.useState<LogoPosition>("left")
  const [logoUrl, setLogoUrl] = React.useState("")
  const [fields, setFields] = React.useState<FieldToken[]>([])
  const [fieldSearch, setFieldSearch] = React.useState("")
  const [loading, setLoading] = React.useState(Boolean(templateId))
  const [saving, setSaving] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      if (!templateId) return
      setLoading(true)
      try {
        const data = await apiFetch<Template>(`/api/document-templates/${templateId}`)
        const extracted = extractHeader(data.htmlTemplate || blankPdf)
        setTemplate(data)
        setTemplateKind((data.kind || "pdf") as TemplateKind)
        setName(data.name || "Untitled template")
        setModule(data.type || "purchase_orders")
        setDescription(data.description || "")
        setBodyHtml(extracted.body)
        setLogoEnabled(extracted.logoEnabled)
        setAddressEnabled(extracted.addressEnabled)
        setLogoUrl(extracted.logoUrl)
        setLogoPosition(extracted.logoPosition)
        setEmailBody(data.emailTemplate || blankEmail)
        setSubject(data.subjectTemplate || "")
        setTo(data.recipientEmailTemplate || "")
      } catch (error) {
        toast.error("Template editor could not load", { description: errorMessage(error, "Load failed") })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [templateId])

  React.useEffect(() => {
    void apiFetch<FieldToken[]>(`/api/document-templates/fields?module=${encodeURIComponent(module)}`).then(setFields).catch((error) => toast.error("Could not load fields", { description: errorMessage(error, "Fields failed") }))
  }, [module])

  const groupedFields = React.useMemo(() => {
    const query = fieldSearch.trim().toLowerCase()
    return groupFields(fields.filter((field) => !query || [field.label, field.path, field.group, field.description].filter(Boolean).join(" ").toLowerCase().includes(query)))
  }, [fields, fieldSearch])

  const header = headerHtml({ logoEnabled, addressEnabled, logoUrl, logoPosition })
  const fullHtml = `${header}${bodyHtml || blankPdf}`
  const closeHref = templateKind === "email" ? "/settings/templates/email" : "/settings/templates/pdf"

  function insertField(path: string) {
    const token = `{{${path}}}`
    if (templateKind === "email") {
      setEmailBody((current) => `${current}${token}`)
      return
    }

    if (mode === "html") {
      setBodyHtml((current) => `${current}${token}`)
      return
    }

    window.dispatchEvent(new CustomEvent(insertMergeFieldEvent, { detail: { html: token } }))
  }

  async function chooseLogoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file")
    const form = new FormData()
    form.append("file", file)
    setUploadingLogo(true)
    try {
      const result = await apiFetch<UploadResult>("/api/products/images", { method: "POST", body: form })
      setLogoUrl(result.url)
      setLogoEnabled(true)
      toast.success("Logo uploaded")
    } catch (error) {
      toast.error("Logo upload failed", { description: errorMessage(error, "Upload failed") })
    } finally {
      setUploadingLogo(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function save() {
    if (!name.trim()) return toast.error("Template name is required")
    setSaving(true)
    try {
      const payload = { name, type: module, kind: templateKind, description, htmlTemplate: fullHtml, emailTemplate: emailBody, subjectTemplate: subject, recipientEmailTemplate: to, isActive: true }
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
    } catch (error) {
      toast.error("Template could not be saved", { description: errorMessage(error, "Save failed") })
    } finally {
      setSaving(false)
    }
  }

  async function preview() {
    setPreviewing(true)
    try {
      const result = await apiFetch<PreviewResult>("/api/document-templates/preview/render", { method: "POST", body: JSON.stringify({ type: module, kind: templateKind, htmlTemplate: fullHtml, emailTemplate: emailBody, subjectTemplate: subject, recipientEmailTemplate: to }) })
      const doc = templateKind === "pdf" ? pdfDocument(result.html || fullHtml) : emailDocument(result, emailBody)
      const url = URL.createObjectURL(new Blob([doc], { type: "text/html" }))
      window.open(url, "_blank", "noopener,noreferrer")
      window.setTimeout(() => URL.revokeObjectURL(url), 30000)
      toast.success("Preview opened")
    } catch (error) {
      toast.error("Preview failed", { description: errorMessage(error, "Preview failed") })
    } finally {
      setPreviewing(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-muted/40"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="grid min-h-screen grid-cols-[17.5rem_minmax(0,1fr)_18.5rem] bg-muted/50">
      <aside className="sticky top-0 flex h-screen min-w-0 flex-col border-r bg-background">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">{templateKind === "email" ? <MailIcon className="size-4" /> : <FileTextIcon className="size-4" />}</div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{templateKind === "email" ? "Email editor" : "PDF editor"}</p><p className="truncate text-xs text-muted-foreground">Template workspace</p></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          <div className="mb-5 border-b pb-4"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Template</p><p className="mt-1 truncate text-sm font-semibold">{name || "Untitled"}</p><p className="truncate text-xs text-muted-foreground">{titleCase(module)}</p></div>
          <div className="grid gap-4">
            <section className="grid gap-3"><h3 className="text-sm font-semibold">Setup</h3><label className="grid gap-1"><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="grid gap-1"><Label>Module</Label><Select value={module} onValueChange={setModule}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{modules.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" /></label></section>
            {templateKind === "pdf" ? <section className="grid gap-3 border-t pt-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="size-4" />Header</h3><label className="flex items-center justify-between gap-3 text-sm"><span>Show logo</span><Checkbox checked={logoEnabled} onCheckedChange={(checked) => setLogoEnabled(Boolean(checked))} /></label><label className="flex items-center justify-between gap-3 text-sm"><span>Show address</span><Checkbox checked={addressEnabled} onCheckedChange={(checked) => setAddressEnabled(Boolean(checked))} /></label><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={chooseLogoFile} /><Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => fileRef.current?.click()}>{uploadingLogo ? <Loader2Icon className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}{uploadingLogo ? "Uploading..." : "Upload logo"}</Button><label className="grid gap-1"><Label>Logo URL</Label><Input value={logoUrl} onChange={(event) => { setLogoUrl(event.target.value); if (event.target.value.trim()) setLogoEnabled(true) }} placeholder="https://.../logo.png" /></label><label className="grid gap-1"><Label>Position</Label><Select value={logoPosition} onValueChange={(value: LogoPosition) => setLogoPosition(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left"><span className="inline-flex items-center gap-2"><AlignLeftIcon className="size-4" />Left</span></SelectItem><SelectItem value="right"><span className="inline-flex items-center gap-2"><AlignRightIcon className="size-4" />Right</span></SelectItem></SelectContent></Select></label></section> : null}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background">
          <div className="flex h-14 items-center justify-between gap-3 px-5"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{titleCase(module)} · {templateKind.toUpperCase()} template</p><h1 className="truncate font-heading text-lg font-semibold tracking-tight">{name}</h1></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={preview} disabled={previewing}>{previewing ? <Loader2Icon className="size-4 animate-spin" /> : <ExternalLinkIcon className="size-4" />}Preview</Button><Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}Save</Button><Button asChild variant="outline" size="sm"><Link href={closeHref}><XIcon className="size-4" />Close</Link></Button></div></div>
          {templateKind === "pdf" ? <div className="border-t bg-card px-4 py-1"><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="document"><TypeIcon className="size-4" />Document</TabsTrigger><TabsTrigger value="html"><CodeIcon className="size-4" />HTML</TabsTrigger></TabsList></Tabs></div> : null}
        </header>

        {templateKind === "pdf" ? (mode === "document" ? <WordEditorAdapter value={bodyHtml} onChange={setBodyHtml} beforeHtml={header} /> : <main className="min-h-[calc(100vh-6.5rem)] bg-muted/60 p-6"><Textarea value={bodyHtml} onChange={(event) => setBodyHtml(event.target.value)} className="mx-auto min-h-[1123px] w-[794px] rounded-none border bg-white p-8 font-mono text-xs shadow-xl" /></main>) : <main className="min-h-[calc(100vh-3.5rem)] bg-muted/60"><div className="mx-auto min-h-full max-w-4xl bg-background p-8 shadow-xl"><div className="grid gap-5"><label className="grid gap-2"><Label>To</Label><Input value={to} onChange={(event) => setTo(event.target.value)} /></label><label className="grid gap-2"><Label>Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="grid gap-2"><Label>Body</Label><Textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} className="min-h-[560px]" /></label></div></div></main>}
      </div>

      <aside className="sticky top-0 flex h-screen min-w-0 flex-col border-l bg-background"><div className="border-b p-4"><h2 className="text-sm font-semibold">Fields</h2><p className="text-xs text-muted-foreground">Click a field to insert it.</p><div className="relative mt-3"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Search fields..." className="pl-9" /></div></div><div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">{Object.entries(groupedFields).map(([group, items]) => <section key={group} className="mb-5 grid gap-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>{items.map((field) => <button key={`${field.group}-${field.path}`} type="button" onClick={() => insertField(field.path)} className="border-b py-2 text-left transition hover:bg-muted/40"><span className="block text-sm font-medium">{field.label}</span><span className="block truncate font-mono text-xs text-muted-foreground">{`{{${field.path}}}`}</span></button>)}</section>)}</div></aside>
    </div>
  )
}
