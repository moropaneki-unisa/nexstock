"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, BoldIcon, CodeIcon, EyeIcon, ItalicIcon, Loader2Icon, SaveIcon, SearchIcon, TypeIcon, UnderlineIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

type Template = {
  id: string
  name: string
  type: string
  description?: string | null
  recipientEmailTemplate?: string | null
  subjectTemplate?: string | null
  htmlTemplate: string
  emailTemplate?: string | null
}

type FieldToken = { label: string; path: string; group: string; description?: string }
type PreviewResult = { to?: string | null; subject: string; html: string; email?: string | null }

function messageFromError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

function groupFields(fields: FieldToken[]) {
  return fields.reduce<Record<string, FieldToken[]>>((acc, field) => {
    acc[field.group] = acc[field.group] || []
    acc[field.group].push(field)
    return acc
  }, {})
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function TemplateEditorContent({ templateId }: { templateId: string }) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRangeRef = React.useRef<Range | null>(null)
  const [template, setTemplate] = React.useState<Template | null>(null)
  const [fields, setFields] = React.useState<FieldToken[]>([])
  const [mode, setMode] = React.useState("document")
  const [fieldSearch, setFieldSearch] = React.useState("")
  const [html, setHtml] = React.useState("")
  const [emailBody, setEmailBody] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [to, setTo] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [preview, setPreview] = React.useState<PreviewResult | null>(null)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await apiFetch<Template>(`/api/document-templates/${templateId}`)
        setTemplate(data)
        setHtml(data.htmlTemplate || "")
        setEmailBody(data.emailTemplate || "")
        setSubject(data.subjectTemplate || "")
        setTo(data.recipientEmailTemplate || "")
        const fieldResult = await apiFetch<FieldToken[]>(`/api/document-templates/fields?module=${encodeURIComponent(data.type || "purchase_orders")}`)
        setFields(fieldResult)
      } catch (err) {
        toast.error("Template editor could not load", { description: messageFromError(err, "Load failed") })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [templateId])

  React.useEffect(() => {
    if (mode !== "document") return
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html
  }, [html, mode])

  const filteredFields = React.useMemo(() => {
    const query = fieldSearch.trim().toLowerCase()
    if (!query) return fields
    return fields.filter((field) => [field.label, field.path, field.group, field.description].filter(Boolean).join(" ").toLowerCase().includes(query))
  }, [fieldSearch, fields])
  const groupedFields = React.useMemo(() => groupFields(filteredFields), [filteredFields])

  function saveSelection() {
    if (mode !== "document") return
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
    if (mode !== "document") return
    editorRef.current?.focus()
    document.execCommand(name, false, commandValue)
    syncHtml()
  }

  function insertField(path: string) {
    const token = `{{${path}}}`
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
      selection.removeAllRanges()
      selection.addRange(range)
      range.deleteContents()
      const node = document.createTextNode(token)
      range.insertNode(node)
      range.setStartAfter(node)
      range.setEndAfter(node)
      selection.removeAllRanges()
      selection.addRange(range)
      savedRangeRef.current = range.cloneRange()
    } else {
      editor.append(document.createTextNode(token))
    }
    syncHtml()
    toast.success("Field inserted", { description: token })
  }

  async function save() {
    if (!template) return
    const latestHtml = mode === "document" ? syncHtml() : html
    setSaving(true)
    try {
      const updated = await apiFetch<Template>(`/api/document-templates/${template.id}`, {
        method: "PATCH",
        body: JSON.stringify({ htmlTemplate: latestHtml, emailTemplate: emailBody, subjectTemplate: subject, recipientEmailTemplate: to }),
      })
      setTemplate(updated)
      toast.success("Template saved", { description: updated.name })
    } catch (err) {
      toast.error("Template could not be saved", { description: messageFromError(err, "Save failed") })
    } finally {
      setSaving(false)
    }
  }

  async function renderPreview() {
    if (!template) return
    const latestHtml = mode === "document" ? syncHtml() : html
    setPreviewing(true)
    try {
      const result = await apiFetch<PreviewResult>("/api/document-templates/preview/render", {
        method: "POST",
        body: JSON.stringify({ type: template.type, htmlTemplate: latestHtml, emailTemplate: emailBody, subjectTemplate: subject, recipientEmailTemplate: to }),
      })
      setPreview(result)
      toast.success("PDF preview updated", { description: result.subject })
    } catch (err) {
      toast.error("Preview failed", { description: messageFromError(err, "Preview failed") })
    } finally {
      setPreviewing(false)
    }
  }

  const pdfHtml = preview?.html || html || "<p>No preview yet.</p>"
  const pdfSrcDoc = `<!doctype html><html><head><meta charset="utf-8"/><style>body{margin:0;background:#e5e7eb;font-family:Arial,sans-serif}.page{width:794px;min-height:1123px;margin:24px auto;background:#fff;color:#111;box-shadow:0 18px 45px rgba(15,23,42,.18);box-sizing:border-box} @media print{body{background:white}.page{margin:0;box-shadow:none;width:auto;min-height:auto}}</style></head><body><div class="page">${pdfHtml}</div></body></html>`

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-muted/20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
  if (!template) return <div className="p-6"><Button asChild variant="outline"><Link href="/settings/templates"><ArrowLeftIcon className="size-4" />Templates</Link></Button></div>

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon"><Link href={`/settings/templates/${template.id}/edit`}><ArrowLeftIcon className="size-4" /></Link></Button>
            <div>
              <p className="text-xs text-muted-foreground">{titleCase(template.type)} template editor</p>
              <h1 className="font-heading text-lg font-semibold tracking-tight">{template.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={renderPreview} disabled={previewing}>{previewing ? <Loader2Icon className="size-4 animate-spin" /> : <EyeIcon className="size-4" />}Preview PDF</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}Save</Button>
          </div>
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[1fr_22rem] lg:p-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div><CardTitle>Editor</CardTitle><CardDescription>Design the PDF document or switch to HTML.</CardDescription></div>
                <Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="document"><TypeIcon className="size-4" />Document</TabsTrigger><TabsTrigger value="html"><CodeIcon className="size-4" />HTML</TabsTrigger></TabsList></Tabs>
              </div>
            </CardHeader>
            <CardContent className="bg-muted/20 p-4">
              {mode === "document" ? (
                <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={syncHtml} onBlur={syncHtml} onKeyUp={saveSelection} onMouseUp={saveSelection} className={cn("min-h-[calc(100vh-15rem)] overflow-auto rounded-xl border bg-white p-8 text-sm leading-6 text-slate-950 shadow-inner outline-none dark:bg-white dark:text-slate-950", "[&_*]:text-inherit [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border-b [&_th]:border-slate-300 [&_th]:p-2")} />
              ) : <Textarea value={html} onChange={(event) => setHtml(event.target.value)} className="min-h-[calc(100vh-15rem)] font-mono text-xs" />}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b"><CardTitle>PDF preview</CardTitle><CardDescription>Rendered inside a PDF page frame.</CardDescription></CardHeader>
            <CardContent className="h-[calc(100vh-10rem)] bg-muted p-0"><iframe title="PDF preview" srcDoc={pdfSrcDoc} className="h-full w-full border-0" /></CardContent>
          </Card>
        </section>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <Card>
            <CardHeader><CardTitle>Text tools</CardTitle><CardDescription>Format selected text.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => command("bold")} disabled={mode !== "document"}><BoldIcon className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => command("italic")} disabled={mode !== "document"}><ItalicIcon className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => command("underline")} disabled={mode !== "document"}><UnderlineIcon className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => command("formatBlock", "H1")} disabled={mode !== "document"}>H1</Button>
              <Button variant="outline" size="sm" onClick={() => command("formatBlock", "H2")} disabled={mode !== "document"}>H2</Button>
              <Button variant="outline" size="sm" onClick={() => command("formatBlock", "P")} disabled={mode !== "document"}>P</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Fields</CardTitle><CardDescription>Click to insert standard or custom fields.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Search fields..." className="pl-9" /></div>
              <div className="grid max-h-[34rem] gap-4 overflow-y-auto pr-1">
                {Object.entries(groupedFields).map(([group, items]) => <div key={group} className="grid gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>{items.map((field) => <button key={`${field.group}-${field.path}`} type="button" onClick={() => insertField(field.path)} className="rounded-lg border bg-background p-3 text-left transition hover:bg-muted/50"><span className="block text-sm font-medium">{field.label}</span><span className="mt-1 block font-mono text-xs text-muted-foreground">{`{{${field.path}}}`}</span>{field.description ? <span className="mt-1 block text-xs text-muted-foreground">{field.description}</span> : null}</button>)}</div>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Email settings</CardTitle><CardDescription>Used when this template is sent.</CardDescription></CardHeader>
            <CardContent className="grid gap-3">
              <label className="grid gap-2"><Label>To</Label><Input value={to} onChange={(event) => setTo(event.target.value)} /></label>
              <label className="grid gap-2"><Label>Subject</Label><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
              <label className="grid gap-2"><Label>Email body</Label><Textarea value={emailBody} onChange={(event) => setEmailBody(event.target.value)} className="min-h-32" /></label>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
