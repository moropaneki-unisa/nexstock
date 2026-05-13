"use client"

import * as React from "react"

import { TemplateEditorContentV2 } from "@/components/templates/template-editor-content-v2"

type TemplateKind = "pdf" | "email"

function getEditor() {
  return document.querySelector<HTMLElement>('[contenteditable="true"]')
}

function getLogoInput() {
  return document.querySelector<HTMLInputElement>('input[placeholder="https://.../logo.png"]')
}

function getPositionValue() {
  const labels = Array.from(document.querySelectorAll("label"))
  const positionLabel = labels.find((label) => label.textContent?.trim().toLowerCase() === "position")
  const button = positionLabel?.parentElement?.querySelector("button")
  return button?.textContent?.toLowerCase().includes("right") ? "right" : "left"
}

function markChanged(node: HTMLElement) {
  node.dispatchEvent(new Event("input", { bubbles: true }))
}

function removeStarterContent() {
  const node = getEditor()
  if (!node || node.dataset.templateStarterChecked === "true") return
  node.dataset.templateStarterChecked = "true"

  const text = node.textContent || ""
  if (!text.includes("{{purchaseOrder.poNumber}}") && !text.includes("{{supplier.name}}")) return

  node.replaceChildren()
  markChanged(node)
}

function showLogoInCanvas() {
  const node = getEditor()
  const input = getLogoInput()
  if (!node || !input) return

  const url = input.value.trim()
  const existing = node.querySelector<HTMLElement>('[data-template-logo="true"]')

  if (!url) {
    existing?.remove()
    markChanged(node)
    return
  }

  const holder = existing || document.createElement("div")
  holder.dataset.templateLogo = "true"
  holder.contentEditable = "false"
  holder.style.display = "flex"
  holder.style.justifyContent = getPositionValue() === "right" ? "flex-end" : "flex-start"
  holder.style.margin = "0 0 12px 0"
  holder.style.padding = "0"

  let img = holder.querySelector("img")
  if (!img) {
    img = document.createElement("img")
    holder.appendChild(img)
  }
  img.src = url
  img.alt = "Logo"
  img.style.maxWidth = "150px"
  img.style.maxHeight = "64px"
  img.style.objectFit = "contain"
  img.style.display = "block"

  if (!existing) node.prepend(holder)
  markChanged(node)
}

function refreshCanvas() {
  removeStarterContent()
  showLogoInCanvas()
}

export function TemplateEditorContentV6({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  React.useEffect(() => {
    const observer = new MutationObserver(refreshCanvas)
    observer.observe(document.body, { childList: true, subtree: true })

    const timer = window.setInterval(refreshCanvas, 700)
    window.setTimeout(refreshCanvas, 120)
    window.setTimeout(refreshCanvas, 900)

    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="nexstock-template-editor-shell">
      <TemplateEditorContentV2 templateId={templateId} kind={kind} />
      <style jsx global>{`
        .nexstock-template-editor-shell > .grid.h-screen {
          grid-template-columns: 17rem minmax(0, 1fr) 18rem !important;
        }
        .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type {
          display: block !important;
        }
        .nexstock-template-editor-shell aside {
          background: hsl(var(--background)) !important;
        }
        .nexstock-template-editor-shell aside:first-child > div:last-child,
        .nexstock-template-editor-shell aside:last-of-type > div {
          padding: 0 !important;
        }
        .nexstock-template-editor-shell aside:first-child .border-b,
        .nexstock-template-editor-shell aside:first-child section,
        .nexstock-template-editor-shell aside:last-of-type section {
          padding-left: 0.875rem !important;
          padding-right: 0.875rem !important;
        }
        .nexstock-template-editor-shell aside:first-child .border.bg-background.p-2 {
          display: none !important;
        }
        .nexstock-template-editor-shell main > div {
          padding: 0 !important;
        }
        .nexstock-template-editor-shell [contenteditable="true"] {
          min-height: calc(100vh - 9rem) !important;
          max-width: none !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 1rem 1.25rem !important;
          box-shadow: none !important;
        }
        .nexstock-template-editor-shell [contenteditable="true"]:empty::before {
          content: "Start designing your template...";
          color: hsl(var(--muted-foreground));
        }
        @media (max-width: 980px) {
          .nexstock-template-editor-shell > .grid.h-screen {
            grid-template-columns: 16rem minmax(0, 1fr) !important;
          }
          .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
