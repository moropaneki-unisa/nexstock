"use client"

import * as React from "react"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  Repeat2Icon,
  Table2Icon,
  UnderlineIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type WordEditorAdapterProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

const emptyDocument = "<p><br></p>"
const defaultRepeatGroup = "lines"

function toPositiveInt(value: string, fallback: number, max: number) {
  const parsed = Number.parseInt(value || "", 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildTableHtml({ rows, columns, repeat, repeatGroup }: { rows: number; columns: number; repeat: boolean; repeatGroup: string }) {
  const headerCells = Array.from(
    { length: columns },
    (_, index) => `<th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc;font-weight:700">Column ${index + 1}</th>`,
  ).join("")
  const bodyCells = Array.from(
    { length: columns },
    (_, index) => `<td style="border:1px solid #e2e8f0;padding:8px">${repeat ? `{{field${index + 1}}}` : "&nbsp;"}</td>`,
  ).join("")

  if (repeat) {
    const group = escapeHtml(repeatGroup.trim() || defaultRepeatGroup)
    return `<table data-repeat-group="${group}" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px"><thead><tr>${headerCells}</tr></thead><tbody>{{#${group}}}<tr>${bodyCells}</tr>{{/${group}}}</tbody></table><p><br></p>`
  }

  const bodyRows = Array.from({ length: rows }, () => `<tr>${bodyCells}</tr>`).join("")
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`
}

export function WordEditorAdapter({ value, onChange, className }: WordEditorAdapterProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [tableDialogOpen, setTableDialogOpen] = React.useState(false)
  const [tableRows, setTableRows] = React.useState("3")
  const [tableColumns, setTableColumns] = React.useState("4")
  const [repeatTable, setRepeatTable] = React.useState(false)
  const [repeatGroup, setRepeatGroup] = React.useState(defaultRepeatGroup)

  React.useEffect(() => {
    if (!editorRef.current) return
    const nextValue = value?.trim() ? value : emptyDocument
    if (editorRef.current.innerHTML !== nextValue) editorRef.current.innerHTML = nextValue
  }, [value])

  function commit(nextValue?: string) {
    const html = nextValue ?? editorRef.current?.innerHTML ?? emptyDocument
    onChange(html.trim() ? html : emptyDocument)
  }

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    commit()
  }

  function insertHtml(html: string) {
    editorRef.current?.focus()
    document.execCommand("insertHTML", false, html)
    commit()
  }

  function openTableDialog(repeat = false) {
    setRepeatTable(repeat)
    if (repeat) setTableRows("1")
    setTableDialogOpen(true)
  }

  function insertConfiguredTable() {
    const columns = toPositiveInt(tableColumns, 4, 12)
    const rows = repeatTable ? 1 : toPositiveInt(tableRows, 3, 50)
    insertHtml(buildTableHtml({ rows, columns, repeat: repeatTable, repeatGroup }))
    setTableDialogOpen(false)
  }

  function toolbarMouseDown(event: React.MouseEvent) {
    event.preventDefault()
  }

  const toolButtonClass = "h-8 gap-1.5 rounded-lg px-2.5 text-xs"

  return (
    <div className="flex min-h-full w-full flex-col gap-3">
      <div className="rounded-xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-center gap-1 border-b px-3 py-2" onMouseDown={toolbarMouseDown}>
          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass} onClick={() => runCommand("formatBlock", "p")}><PilcrowIcon className="size-4" />Paragraph</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass} onClick={() => runCommand("formatBlock", "h1")}><Heading1Icon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass} onClick={() => runCommand("formatBlock", "h2")}><Heading2Icon className="size-4" /></Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("bold")} title="Bold"><BoldIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("italic")} title="Italic"><ItalicIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("underline")} title="Underline"><UnderlineIcon className="size-4" /></Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("justifyLeft")} title="Align left"><AlignLeftIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("justifyCenter")} title="Align center"><AlignCenterIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("justifyRight")} title="Align right"><AlignRightIcon className="size-4" /></Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("insertUnorderedList")} title="Bullets"><ListIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => runCommand("insertOrderedList")} title="Numbered list"><ListOrderedIcon className="size-4" /></Button>
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg bg-primary/5 p-1">
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass} onClick={() => openTableDialog(false)}><Table2Icon className="size-4" />Table</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass} onClick={() => openTableDialog(true)}><Repeat2Icon className="size-4" />Repeat table</Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => insertHtml("<hr style=\"border:0;border-top:1px solid #cbd5e1;margin:20px 0\"><p><br></p>")} title="Divider"><MinusIcon className="size-4" /></Button>
          </div>
        </div>
        <div className="px-3 py-2 text-xs text-muted-foreground">Design your template like a document. Use repeat tables for product lines, purchase-order lines, invoice rows, or quote items.</div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Template document editor"
        className={cn(
          "prose prose-slate max-w-none min-h-[760px] w-full flex-1 cursor-text overflow-auto rounded-xl border border-dashed border-slate-200 bg-white px-5 py-4 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 [&_font[size='2']]:text-xs [&_font[size='4']]:text-lg [&_font[size='5']]:text-2xl [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2",
          className,
        )}
        onInput={(event) => commit(event.currentTarget.innerHTML)}
        onPaste={(event) => {
          event.preventDefault()
          const text = event.clipboardData.getData("text/plain")
          document.execCommand("insertText", false, text)
          commit()
        }}
      />

      <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{repeatTable ? "Insert repeat table" : "Insert table"}</DialogTitle>
            <DialogDescription>
              Choose the table size. Repeat tables create a dynamic loop block for line items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <Label>Columns</Label>
                <Input type="number" min={1} max={12} value={tableColumns} onChange={(event) => setTableColumns(event.target.value)} />
              </label>
              <label className="grid gap-2">
                <Label>Rows</Label>
                <Input type="number" min={1} max={50} value={tableRows} disabled={repeatTable} onChange={(event) => setTableRows(event.target.value)} />
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
              <Checkbox checked={repeatTable} onCheckedChange={(checked) => setRepeatTable(Boolean(checked))} />
              <span className="grid gap-1">
                <span className="font-medium">Repeat rows from data</span>
                <span className="text-muted-foreground">Wrap the body row with a template loop, for example {"{{#lines}}...{{/lines}}"}.</span>
              </span>
            </label>
            {repeatTable ? (
              <label className="grid gap-2">
                <Label>Repeat group</Label>
                <Input value={repeatGroup} onChange={(event) => setRepeatGroup(event.target.value)} placeholder="lines" />
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTableDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={insertConfiguredTable}>{repeatTable ? "Insert repeat table" : "Insert table"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
