"use client"

import * as React from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { EditIcon, FileTextIcon, Loader2Icon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { RecordsTable, createSelectColumn, type RecordsTableBulkAction } from "@/components/records/records-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

type DocumentTemplate = {
  id: string
  name: string
  type: string
  description?: string | null
  subjectTemplate?: string | null
  isDefault: boolean
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value?: string | null) {
  if (!value) return "Not set"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString()
}

function Loading() {
  return <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6"><div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /></CardHeader><CardFooter><Skeleton className="h-4 w-40" /></CardFooter></Card>)}</div><div className="px-4 lg:px-6"><Skeleton className="h-[420px] rounded-xl" /></div></div>
}

export function TemplatesContent() {
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [running, setRunning] = React.useState(false)

  async function loadTemplates() {
    setLoading(true)
    try { setTemplates(await apiFetch<DocumentTemplate[]>("/api/document-templates")) }
    catch (err) { toast.error("Templates could not load", { description: err instanceof Error ? err.message : "Load failed" }) }
    finally { setLoading(false) }
  }

  React.useEffect(() => { void loadTemplates() }, [])

  async function deactivate(template: DocumentTemplate) {
    setRunning(true)
    try { await apiFetch(`/api/document-templates/${template.id}`, { method: "DELETE" }); toast.success("Template deactivated", { description: template.name }); await loadTemplates() }
    catch (err) { toast.error("Could not deactivate template", { description: err instanceof Error ? err.message : "Delete failed" }) }
    finally { setRunning(false) }
  }

  async function bulkDeactivate(rows: DocumentTemplate[]) {
    setRunning(true)
    try { await Promise.all(rows.map((template) => apiFetch(`/api/document-templates/${template.id}`, { method: "DELETE" }))); toast.success("Templates deactivated", { description: `${rows.length} selected.` }); await loadTemplates() }
    catch (err) { toast.error("Could not deactivate selected templates", { description: err instanceof Error ? err.message : "Bulk action failed" }) }
    finally { setRunning(false) }
  }

  const active = templates.filter((template) => template.isActive).length
  const defaults = templates.filter((template) => template.isDefault).length
  const purchaseOrder = templates.filter((template) => template.type === "purchase_order").length
  const invoices = templates.filter((template) => template.type === "supplier_invoice").length

  const columns = React.useMemo<ColumnDef<DocumentTemplate>[]>(() => [
    createSelectColumn<DocumentTemplate>(),
    { accessorKey: "name", header: "Template", cell: ({ row }) => <div className="grid gap-1"><Link href={`/settings/templates/${row.original.id}/edit`} className="font-medium hover:underline">{row.original.name}</Link><span className="text-xs text-muted-foreground">{row.original.description || "No description"}</span></div>, enableHiding: false },
    { accessorKey: "type", header: "Type", cell: ({ row }) => titleCase(row.original.type) },
    { accessorKey: "subjectTemplate", header: "Subject", cell: ({ row }) => row.original.subjectTemplate || "Not set" },
    { id: "status", header: "Status", cell: ({ row }) => <div className="flex gap-2">{row.original.isDefault ? <Badge>Default</Badge> : null}<Badge variant={row.original.isActive ? "secondary" : "outline"}>{row.original.isActive ? "Active" : "Inactive"}</Badge></div> },
    { id: "updatedAt", header: "Updated", cell: ({ row }) => formatDate(row.original.updatedAt) },
    { id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-1"><Button asChild variant="ghost" size="icon" className="size-8"><Link href={`/settings/templates/${row.original.id}/edit`}><EditIcon className="size-4" /></Link></Button><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void deactivate(row.original)} disabled={running}><Trash2Icon className="size-4" /></Button></div>, enableHiding: false },
  ], [running])

  const bulkActions = React.useMemo<RecordsTableBulkAction<DocumentTemplate>[]>(() => [{ label: "Deactivate selected", variant: "destructive", onClick: bulkDeactivate }], [])

  if (loading) return <Loading />

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div><p className="text-sm text-muted-foreground">Settings</p><h1 className="font-heading text-2xl font-semibold tracking-tight">Templates</h1><p className="mt-1 text-sm text-muted-foreground">Create mail-merge templates for purchase order PDFs, supplier invoices, and Resend email bodies.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void loadTemplates()} disabled={running || loading}>{running ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}Refresh</Button><Button asChild size="sm"><Link href="/settings/templates/new"><PlusIcon className="size-4" />New template</Link></Button></div>
        </div>
        <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          <Metric title="Total" value={templates.length} detail={`${active} active`} />
          <Metric title="Defaults" value={defaults} detail="Per document type" />
          <Metric title="Purchase orders" value={purchaseOrder} detail="PO document templates" />
          <Metric title="Supplier invoices" value={invoices} detail="Invoice/bill templates" />
        </div>
        <RecordsTable data={templates} columns={columns} title="Template directory" description="Templates use placeholders like {{purchaseOrder.poNumber}}, {{supplier.name}}, and {{#lines}}...{{/lines}}." searchPlaceholder="Search template name, type, subject..." getRowId={(row) => row.id} bulkActions={bulkActions} />
      </div>
    </div>
  )
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return <Card className="@container/card"><CardHeader><CardDescription>{title}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle></CardHeader><CardFooter className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{detail}</span><FileTextIcon className="size-4 text-muted-foreground" /></CardFooter></Card>
}
