"use client"

import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

type DocxEditorAdapterProps = {
  documentBuffer: ArrayBuffer | null
  fallbackHtml: string
  onFallbackHtmlChange: (value: string) => void
  className?: string
}

type DocxEditorHandle = {
  save?: () => Promise<unknown> | unknown
  getDocument?: () => Promise<unknown> | unknown
  export?: () => Promise<unknown> | unknown
}

type PackageEditor = React.ComponentType<Record<string, unknown>>

export type DocxEditorAdapterRef = {
  save: () => Promise<unknown>
}

function pickEditor(module: Record<string, unknown>): PackageEditor | null {
  const candidates = [module.DocxEditor, module.default, module.Editor, module.DocumentEditor]
  for (const candidate of candidates) {
    if (typeof candidate === "function" || (typeof candidate === "object" && candidate !== null)) return candidate as PackageEditor
  }
  return null
}

export const DocxEditorAdapter = React.forwardRef<DocxEditorAdapterRef, DocxEditorAdapterProps>(
  function DocxEditorAdapter({ documentBuffer, fallbackHtml, onFallbackHtmlChange, className }, ref) {
    const innerRef = React.useRef<DocxEditorHandle | null>(null)
    const fallbackRef = React.useRef<HTMLDivElement>(null)
    const [Editor, setEditor] = React.useState<PackageEditor | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [failed, setFailed] = React.useState(false)

    React.useEffect(() => {
      let cancelled = false

      async function load() {
        try {
          const module = await import("@eigenpal/docx-js-editor")
          if (cancelled) return
          const picked = pickEditor(module as Record<string, unknown>)
          if (!picked) setFailed(true)
          else setEditor(() => picked)
        } catch {
          if (!cancelled) setFailed(true)
        } finally {
          if (!cancelled) setLoading(false)
        }
      }

      void load()
      return () => {
        cancelled = true
      }
    }, [])

    React.useEffect(() => {
      if (Editor || !fallbackRef.current) return
      if (fallbackRef.current.innerHTML !== fallbackHtml) fallbackRef.current.innerHTML = fallbackHtml
    }, [Editor, fallbackHtml])

    React.useImperativeHandle(ref, () => ({
      async save() {
        const handle = innerRef.current
        if (handle?.save) return await handle.save()
        if (handle?.getDocument) return await handle.getDocument()
        if (handle?.export) return await handle.export()
        return fallbackRef.current?.innerHTML || fallbackHtml
      },
    }), [fallbackHtml])

    if (loading) {
      return (
        <div className={cn("flex min-h-[640px] items-center justify-center text-muted-foreground", className)}>
          <Loader2Icon className="mr-2 size-4 animate-spin" />
          Loading document editor...
        </div>
      )
    }

    if (Editor && !failed) {
      return (
        <div className={cn("min-h-[860px] w-full", className)}>
          <Editor
            ref={innerRef}
            documentBuffer={documentBuffer || undefined}
            value={documentBuffer || undefined}
            buffer={documentBuffer || undefined}
            className="min-h-[860px] w-full"
            onChange={(value: unknown) => {
              if (typeof value === "string") onFallbackHtmlChange(value)
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
        className={cn("min-h-[860px] w-full outline-none", className)}
        onInput={(event) => onFallbackHtmlChange(event.currentTarget.innerHTML || "<p><br></p>")}
        onBlur={(event) => onFallbackHtmlChange(event.currentTarget.innerHTML || "<p><br></p>")}
      />
    )
  },
)
