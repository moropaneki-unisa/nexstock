"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type WordEditorAdapterProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

const emptyDocument = "<p><br></p>"

export function WordEditorAdapter({ value, onChange, className }: WordEditorAdapterProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!editorRef.current) return
    const nextValue = value?.trim() ? value : emptyDocument
    if (editorRef.current.innerHTML !== nextValue) editorRef.current.innerHTML = nextValue
  }, [value])

  function commit(nextValue: string) {
    onChange(nextValue.trim() ? nextValue : emptyDocument)
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Template document editor"
      className={cn(
        "prose prose-slate max-w-none min-h-full w-full cursor-text outline-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2",
        className,
      )}
      onInput={(event) => commit(event.currentTarget.innerHTML)}
    />
  )
}
