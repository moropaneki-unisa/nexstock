"use client"

import * as React from "react"

import { TemplateEditorContentV2 } from "@/components/templates/template-editor-content-v2"

type TemplateKind = "pdf" | "email"

function getLogoUrlInput() {
  return document.querySelector<HTMLInputElement>('input[placeholder="https://.../logo.png"]')
}

function getEditorSurface() {
  return document.querySelector<HTMLElement>('[contenteditable="true"]')
}

function getLogoPosition() {
  const labels = Array.from(document.querySelectorAll("label"))
  const positionLabel = labels.find((label) => label.textContent?.trim().toLowerCase() === "position")
  const trigger = positionLabel?.parentElement?.querySelector("button")
  return trigger?.textContent?.toLowerCase().includes("right") ? "right" : "left"
}

function syncLogoIntoEditor() {
  const input = getLogoUrlInput()
  const editor = getEditorSurface()
  if (!input || !editor) return

  const existing = editor.querySelector<HTMLElement>('[data-live-template-logo="true"]')
  const url = input.value.trim()

  if (!url) {
    existing?.remove()
    return
  }

  const position = getLogoPosition()
  const logo = existing ?? document.createElement("div")
  logo.setAttribute("data-live-template-logo", "true")
  logo.setAttribute("contenteditable", "false")
  logo.style.display = "flex"
  logo.style.justifyContent = position === "right" ? "flex-end" : "flex-start"
  logo.style.marginBottom = "28px"
  logo.style.width = "100%"
  logo.innerHTML = `<img src="${url.replace(/"/g, "&quot;")}" alt="Logo" style="max-width:150px;max-height:64px;object-fit:contain;display:block" />`

  if (!existing) editor.prepend(logo)
}

export function TemplateEditorContentV4({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  React.useEffect(() => {
    const onInput = () => syncLogoIntoEditor()
    const root = document.querySelector(".nexstock-template-editor-shell")
    const observer = new MutationObserver(() => syncLogoIntoEditor())

    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener("input", onInput, true)
    document.addEventListener("change", onInput, true)
    window.setTimeout(syncLogoIntoEditor, 250)
    window.setTimeout(syncLogoIntoEditor, 1000)

    return () => {
      observer.disconnect()
      document.removeEventListener("input", onInput, true)
      document.removeEventListener("change", onInput, true)
    }
  }, [])

  return (
    <div className="nexstock-template-editor-shell">
      <TemplateEditorContentV2 templateId={templateId} kind={kind} />
      <style jsx global>{`
        .nexstock-template-editor-shell > .grid.h-screen {
          grid-template-columns: 18rem minmax(0, 1fr) 20rem !important;
        }

        .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type {
          display: block !important;
        }

        .nexstock-template-editor-shell > .grid.h-screen > aside:first-child,
        .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type,
        .nexstock-template-editor-shell > .grid.h-screen > div {
          min-width: 0;
        }

        .nexstock-template-editor-shell aside section,
        .nexstock-template-editor-shell aside .rounded-lg,
        .nexstock-template-editor-shell aside .rounded-xl {
          box-shadow: none !important;
        }

        .nexstock-template-editor-shell aside section {
          border-radius: 0 !important;
          background: transparent !important;
        }

        .nexstock-template-editor-shell aside:first-child input,
        .nexstock-template-editor-shell aside:first-child textarea,
        .nexstock-template-editor-shell aside:first-child button[role="combobox"] {
          border-radius: 0.5rem !important;
          background: hsl(var(--background)) !important;
        }

        .nexstock-template-editor-shell aside:first-child .border.bg-background.p-2 {
          display: none !important;
        }

        .nexstock-template-editor-shell [contenteditable="true"] {
          min-height: 1123px !important;
        }

        @media (max-width: 980px) {
          .nexstock-template-editor-shell > .grid.h-screen {
            grid-template-columns: 17rem minmax(0, 1fr) !important;
          }

          .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
