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
  beforeHtml?: string
}

type ToolbarState = {
  bold: boolean
  italic: boolean
  underline: boolean
  justifyLeft: boolean
  justifyCenter: boolean
  justifyRight: boolean
  unorderedList: boolean
  orderedList: boolean
  heading1: boolean
  heading2: boolean
  paragraph: boolean
  fontSize: string
}

type ResizeState = {
  table: HTMLTableElement
  col: HTMLTableColElement
  startX: number
  startWidth: number
}

const emptyDocument = "<p><br></p>"
const defaultRepeatGroup = "lines"
const resizeHotspotPx = 8
const minColumnWidth = 48
const cellWrapStyle = `word-break:break-word;overflow-wrap:anywhere;white-space:normal;vertical-align:top;max-width:0`
const inactiveToolbarState: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  unorderedList: false,
  orderedList: false,
  heading1: false,
  heading2: false,
  paragraph: true,
  fontSize: "3",
}

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

function buildColGroup(columns: number) {
  const width = `${Math.floor(100 / columns)}%`
  return `<colgroup>${Array.from({ length: columns }, () => `<col style="width:${width}" />`).join("")}</colgroup>`
}

function buildTableHtml({ rows, columns, repeat, repeatGroup }: { rows: number; columns: number; repeat: boolean; repeatGroup: string }) {
  const headerCells = Array.from(
    { length: columns },
    (_, index) => `<th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc;font-weight:700;min-width:${minColumnWidth}px;${cellWrapStyle}">Column ${index + 1}</th>`,
  ).join("")
  const bodyCells = Array.from(
    { length: columns },
    (_, index) => `<td style="border:1px solid #e2e8f0;padding:8px;min-width:${minColumnWidth}px;${cellWrapStyle}">${repeat ? `{{field${index + 1}}}` : "&nbsp;"}</td>`,
  ).join("")
  const colGroup = buildColGroup(columns)

  if (repeat) {
    const group = escapeHtml(repeatGroup.trim() || defaultRepeatGroup)
    return `<table data-repeat-group="${group}" data-resizable-table="true" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:16px 0;font-size:13px">${colGroup}<thead><tr>${headerCells}</tr></thead><tbody>{{#${group}}}<tr>${bodyCells}</tr>{{/${group}}}</tbody></table><p><br></p>`
  }

  const bodyRows = Array.from({ length: rows }, () => `<tr>${bodyCells}</tr>`).join("")
  return `<table data-resizable-table="true" style="width:100%;table-layout:fixed;border-collapse:collapse;margin:16px 0;font-size:13px">${colGroup}<thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`
}

function findResizableCell(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null
  const cell = target.closest("td,th")
  if (!(cell instanceof HTMLTableCellElement)) return null
  const table = cell.closest("table")
  if (!(table instanceof HTMLTableElement)) return null
  return { cell, table }
}

function ensureColGroup(table: HTMLTableElement) {
  const firstRow = table.rows[0]
  const columnCount = firstRow?.cells.length ?? 0
  let colgroup = table.querySelector("colgroup")
  if (!colgroup) {
    colgroup = document.createElement("colgroup")
    table.insertBefore(colgroup, table.firstChild)
  }

  while (colgroup.children.length < columnCount) {
    const col = document.createElement("col")
    col.style.width = `${Math.floor(100 / Math.max(columnCount, 1))}%`
    colgroup.appendChild(col)
  }

  return colgroup
}

function normalizeTables(root: HTMLElement) {
  root.querySelectorAll("table").forEach((table) => {
    if (!(table instanceof HTMLTableElement)) return
    table.style.tableLayout = "fixed"
    table.style.width = table.style.width || "100%"
    table.style.borderCollapse = table.style.borderCollapse || "collapse"
    ensureColGroup(table)
    table.querySelectorAll("th,td").forEach((cell) => {
      if (!(cell instanceof HTMLTableCellElement)) return
      cell.style.wordBreak = "break-word"
      cell.style.overflowWrap = "anywhere"
      cell.style.whiteSpace = "normal"
      cell.style.verticalAlign = "top"
      cell.style.maxWidth = "0"
    })
  })
}

export function WordEditorAdapter({ value, onChange, className, beforeHtml }: WordEditorAdapterProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRangeRef = React.useRef<Range | null>(null)
  const resizeStateRef = React.useRef<ResizeState | null>(null)
  const [tableDialogOpen, setTableDialogOpen] = React.useState(false)
  const [tableRows, setTableRows] = React.useState("3")
  const [tableColumns, setTableColumns] = React.useState("4")
  const [repeatTable, setRepeatTable] = React.useState(false)
  const [repeatGroup, setRepeatGroup] = React.useState(defaultRepeatGroup)
  const [toolbarState, setToolbarState] = React.useState<ToolbarState>(inactiveToolbarState)

  React.useEffect(() => {
    if (!editorRef.current) return
    const nextValue = value?.trim() ? value : emptyDocument
    if (editorRef.current.innerHTML !== nextValue) editorRef.current.innerHTML = nextValue
    normalizeTables(editorRef.current)
  }, [value])

  React.useEffect(() => {
    function handleResizeMove(event: MouseEvent) {
      const state = resizeStateRef.current
      if (!state) return
      const nextWidth = Math.max(minColumnWidth, state.startWidth + event.clientX - state.startX)
      state.col.style.width = `${nextWidth}px`
      state.table.style.tableLayout = "fixed"
      commit(state.table.closest("[contenteditable='true']")?.innerHTML)
    }

    function stopResize() {
      if (!resizeStateRef.current) return
      resizeStateRef.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      commit()
    }

    window.addEventListener("mousemove", handleResizeMove)
    window.addEventListener("mouseup", stopResize)
    return () => {
      window.removeEventListener("mousemove", handleResizeMove)
      window.removeEventListener("mouseup", stopResize)
    }
  }, [])

  function commit(nextValue?: string) {
    if (editorRef.current) normalizeTables(editorRef.current)
    const html = nextValue ?? editorRef.current?.innerHTML ?? emptyDocument
    onChange(html.trim() ? html : emptyDocument)
  }

  function refreshToolbarState() {
    const block = String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "")
    const fontSize = String(document.queryCommandValue("fontSize") || "3")
    setToolbarState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      heading1: block === "h1",
      heading2: block === "h2",
      paragraph: !block || block === "p" || block === "div",
      fontSize,
    })
  }

  function saveSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange()
      refreshToolbarState()
    }
  }

  function restoreSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection) return
    editor.focus()
    const range = savedRangeRef.current
    if (range) {
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    const fallbackRange = document.createRange()
    fallbackRange.selectNodeContents(editor)
    fallbackRange.collapse(false)
    selection.removeAllRanges()
    selection.addRange(fallbackRange)
  }

  function runCommand(command: string, commandValue?: string) {
    restoreSelection()
    document.execCommand(command, false, commandValue)
    saveSelection()
    refreshToolbarState()
    commit()
  }

  function insertHtml(html: string) {
    restoreSelection()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      if (editorRef.current) editorRef.current.insertAdjacentHTML("beforeend", html)
      commit()
      return
    }

    const range = selection.getRangeAt(0)
    range.deleteContents()
    const fragment = range.createContextualFragment(html)
    const lastNode = fragment.lastChild
    range.insertNode(fragment)

    if (lastNode) {
      const nextRange = document.createRange()
      nextRange.setStartAfter(lastNode)
      nextRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(nextRange)
      savedRangeRef.current = nextRange.cloneRange()
    }

    refreshToolbarState()
    commit()
  }

  function openTableDialog(repeat = false) {
    saveSelection()
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

  function maybeStartColumnResize(event: React.MouseEvent<HTMLDivElement>) {
    const result = findResizableCell(event.target)
    if (!result) return
    const { cell, table } = result
    const rect = cell.getBoundingClientRect()
    const nearRightEdge = rect.right - event.clientX <= resizeHotspotPx
    if (!nearRightEdge) return

    event.preventDefault()
    event.stopPropagation()

    const colgroup = ensureColGroup(table)
    const col = colgroup.children.item(cell.cellIndex)
    if (!(col instanceof HTMLTableColElement)) return

    resizeStateRef.current = {
      table,
      col,
      startX: event.clientX,
      startWidth: cell.getBoundingClientRect().width,
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  function maybeShowColumnResizeCursor(event: React.MouseEvent<HTMLDivElement>) {
    const result = findResizableCell(event.target)
    if (!result) {
      event.currentTarget.style.cursor = "text"
      return
    }
    const rect = result.cell.getBoundingClientRect()
    event.currentTarget.style.cursor = rect.right - event.clientX <= resizeHotspotPx ? "col-resize" : "text"
  }

  function toolButtonClass(active = false) {
    return cn(
      "h-8 gap-1.5 rounded-lg px-2.5 text-xs transition",
      active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
    )
  }

  function iconButtonClass(active = false) {
    return cn(
      "rounded-lg transition",
      active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground",
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/60">
      <div className="shrink-0 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-1" onMouseDown={toolbarMouseDown}>
          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.paragraph)} onClick={() => runCommand("formatBlock", "p")}><PilcrowIcon className="size-4" />Paragraph</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.heading1)} onClick={() => runCommand("formatBlock", "h1")}><Heading1Icon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.heading2)} onClick={() => runCommand("formatBlock", "h2")}><Heading2Icon className="size-4" /></Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.fontSize === "2")} onClick={() => runCommand("fontSize", "2")}>Small</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.fontSize === "3")} onClick={() => runCommand("fontSize", "3")}>Normal</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.fontSize === "4")} onClick={() => runCommand("fontSize", "4")}>Large</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(toolbarState.fontSize === "5")} onClick={() => runCommand("fontSize", "5")}>Title</Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.bold)} onClick={() => runCommand("bold")} title="Bold"><BoldIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.italic)} onClick={() => runCommand("italic")} title="Italic"><ItalicIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.underline)} onClick={() => runCommand("underline")} title="Underline"><UnderlineIcon className="size-4" /></Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.justifyLeft)} onClick={() => runCommand("justifyLeft")} title="Align left"><AlignLeftIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.justifyCenter)} onClick={() => runCommand("justifyCenter")} title="Align center"><AlignCenterIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.justifyRight)} onClick={() => runCommand("justifyRight")} title="Align right"><AlignRightIcon className="size-4" /></Button>
          </div>

          <div className="mr-2 flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.unorderedList)} onClick={() => runCommand("insertUnorderedList")} title="Bullets"><ListIcon className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon-sm" className={iconButtonClass(toolbarState.orderedList)} onClick={() => runCommand("insertOrderedList")} title="Numbered list"><ListOrderedIcon className="size-4" /></Button>
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg bg-primary/5 p-1">
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(false)} onClick={() => openTableDialog(false)}><Table2Icon className="size-4" />Table</Button>
            <Button type="button" variant="ghost" size="sm" className={toolButtonClass(false)} onClick={() => openTableDialog(true)}><Repeat2Icon className="size-4" />Repeat table</Button>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => insertHtml("<hr style=\"border:0;border-top:1px solid #cbd5e1;margin:20px 0\"><p><br></p>")} title="Divider"><MinusIcon className="size-4" /></Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-4 lg:px-4 lg:py-5">
        <div className="mx-auto min-h-[1123px] w-[794px] bg-white px-[68px] py-[64px] text-sm leading-6 text-slate-950 shadow-xl ring-1 ring-slate-200">
          {beforeHtml ? <div dangerouslySetInnerHTML={{ __html: beforeHtml }} /> : null}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Template document editor"
            className={cn(
              "prose prose-slate max-w-none min-h-[820px] w-full cursor-text outline-none focus:ring-0 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_font[size='2']]:text-xs [&_font[size='4']]:text-lg [&_font[size='5']]:text-2xl [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:my-4 [&_td]:max-w-0 [&_td]:whitespace-normal [&_td]:break-words [&_td]:[overflow-wrap:anywhere] [&_td]:align-top [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:max-w-0 [&_th]:whitespace-normal [&_th]:break-words [&_th]:[overflow-wrap:anywhere] [&_th]:align-top [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-2",
              className,
            )}
            onInput={(event) => { saveSelection(); commit(event.currentTarget.innerHTML) }}
            onKeyUp={saveSelection}
            onMouseDown={maybeStartColumnResize}
            onMouseMove={maybeShowColumnResizeCursor}
            onMouseUp={saveSelection}
            onFocus={() => { saveSelection(); refreshToolbarState() }}
            onPaste={(event) => {
              event.preventDefault()
              const text = event.clipboardData.getData("text/plain")
              restoreSelection()
              document.execCommand("insertText", false, text)
              saveSelection()
              refreshToolbarState()
              commit()
            }}
          />
        </div>
      </div>

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
