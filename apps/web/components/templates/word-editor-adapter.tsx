"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type WordEditorAdapterProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

type EditorComponent = React.ComponentType<Record<string, unknown>>

function pickEditorComponent(module: Record<string, unknown>): EditorComponent | null {
  const candidates = [
    module.default,
    module.DocxEditor,
    module.DocumentEditor,
    module.Editor,
    module.WordEditor,
    module.ReactWordEditor,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "function" || (typeof candidate === "object" && candidate !== null)) {
      return candidate as EditorComponent
    }
  }

  return null
}

export function WordEditorAdapter({ value, onChange, className }: WordEditorAdapterProps) {
  const fallbackRef = React.useRef<HTMLDivElement>(null)
  const [PackageEditor, setPackageEditor] = React.useState<EditorComponent | null>(null)
  const [packageFailed, setPackageFailed] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function loadEditor() {
      try {
        const module = await import("@eigenpal/docx-js-editor")
        if (cancelled) return
        const Editor = pickEditorComponent(module as Record<string, unknown>)
        if (Editor) setPackageEditor(() => Editor)
        else setPackageFailed(true)
      } catch {
        if (!cancelled) setPackageFailed(true)
      }
    }

    void loadEditor()

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (PackageEditor || !fallbackRef.current) return
    if (fallbackRef.current.innerHTML !== value) fallbackRef.current.innerHTML = value
  }, [PackageEditor, value])

  if (PackageEditor && !packageFailed) {
    return (
      <div className={cn("word-package-editor h-full w-full", className)}>
        <PackageEditor
          value={value}
          data={value}
          html={value}
          content={value}
          onChange={(next: unknown) => {
            if (typeof next === "string") onChange(next)
            else if (next && typeof next === "object" && "html" in next) onChange(String((next as { html?: unknown }).html || ""))
            else if (next && typeof next === "object" && "content" in next) onChange(String((next as { content?: unknown }).content || ""))
          }}
          onUpdate={(next: unknown) => {
            if (typeof next === "string") onChange(next)
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={fallbackRef}
      contentEditable
      suppressContentEditableWarning
      className={cn("min-h-full w-full outline-none", className)}
      onInput={(event) => onChange(event.currentTarget.innerHTML || "<p><br></p>")}
      onBlur={(event) => onChange(event.currentTarget.innerHTML || "<p><br></p>")}
    />
  )
}
