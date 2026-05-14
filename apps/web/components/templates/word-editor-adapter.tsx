"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type WordEditorAdapterProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

const emptyDocument = "<p><br></p>"
const defaultRepeatGroup = "lines"

function toPositiveInt(value: string | null, fallback: number, max: number) {
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
  const headerCells = Array.from({ length: columns }, (_, index) => `<th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc;font-weight:700">Column ${index + 1}</th>`).join("")
  const bodyCells = Array.from({ length: columns }, (_, index) => `<td style="border:1px solid #e2e8f0;padding:8px">${repeat ? `{{field${index + 1}}}` : "&nbsp;"}</td>`).join("")

  if (repeat) {
    const group = escapeHtml(repeatGroup.trim() || defaultRepeatGroup)
    return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px"><thead><tr>${headerCells}</tr></thead><tbody>{{#${group}}}<tr>${bodyCells}</tr>{{/${group}}}</tbody></table><p><br></p>`
  }

  const bodyRows = Array.from({ length: rows }, () => `<tr>${bodyCells}</tr>`).join("")
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`
}

export function WordEditorAdapter({ value, onChange, className }: WordEditorAdapterProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)

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

  function insertTable(repeat: boolean) {
    const columns = toPositiveInt(window.prompt("How many columns?", "4"), 4, 12)
    const rows = repeat ? 1 : toPositiveInt(window.prompt("How many rows?", "3"), 3, 50)
    const repeatGroup = repeat ? window.prompt("Repeat group name", defaultRepeatGroup) || defaultRepeatGroup : defaultRepeatGroup
    insertHtml(buildTableHtml({ rows, columns, repeat, repeatGroup }))
  }

  function toolbarMouseDown(event: React.MouseEvent) {
    event.preventDefault()
  }

  const buttonClass = "rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 active:bg-slate-200"
  const selectClass = "h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none"

  return (
    <div className="flex min-h-full w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur" onMouseDown={toolbarMouseDown}>
        <select className={selectClass} defaultValue="p" aria-label="Text style" onChange={(event) => runCommand("formatBlock", event.target.value)}>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select className={selectClass} defaultValue="3" aria-label="Font size" onChange={(event) => runCommand("fontSize", event.target.value)}>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Title</option>
        </select>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("bold")}>Bold</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("italic")}>Italic</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("underline")}>Underline</button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("justifyLeft")}>Left</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("justifyCenter")}>Center</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("justifyRight")}>Right</button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("insertUnorderedList")}>Bullets</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => runCommand("insertOrderedList")}>Numbers</button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => insertTable(false)}>Table</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => insertTable(true)}>Repeat table</button>
        <button type="button" className={buttonClass} onMouseDown={toolbarMouseDown} onClick={() => insertHtml("<hr style=\"border:0;border-top:1px solid #cbd5e1;margin:20px 0\"><p><br></p>")}>Line</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Template document editor"
        className={cn(
          "prose prose-slate max-w-none min-h-[760px] w-full flex-1 cursor-text overflow-auto px-5 py-4 outline-none focus:ring-0 [&_font[size='2']]:text-xs [&_font[size='4']]:text-lg [&_font[size='5']]:text-2xl [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2",
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
    </div>
  )
}
