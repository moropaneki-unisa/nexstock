"use client"

import * as React from "react"

import { TemplateEditorContentV2 } from "@/components/templates/template-editor-content-v2"

type TemplateKind = "pdf" | "email"
type HeaderState = {
  logo: boolean
  address: boolean
  position: "left" | "right"
  logoUrl: string
}

const headerId = "nexstock-template-header-controls"
const headerSelector = '[data-template-header="true"]'

function getEditor() {
  return document.querySelector<HTMLElement>('[contenteditable="true"]')
}

function getLogoInput() {
  return document.querySelector<HTMLInputElement>('input[placeholder="https://.../logo.png"]')
}

function getPositionValue(): "left" | "right" {
  const labels = Array.from(document.querySelectorAll("label"))
  const positionLabel = labels.find((label) => label.textContent?.trim().toLowerCase() === "position")
  const button = positionLabel?.parentElement?.querySelector("button")
  return button?.textContent?.toLowerCase().includes("right") ? "right" : "left"
}

function emitEditorInput(node: HTMLElement) {
  node.dispatchEvent(new Event("input", { bubbles: true }))
}

function getState(): HeaderState {
  const logoToggle = document.querySelector<HTMLInputElement>('[data-template-toggle="logo"]')
  const addressToggle = document.querySelector<HTMLInputElement>('[data-template-toggle="address"]')
  const logoInput = getLogoInput()

  return {
    logo: logoToggle?.checked ?? false,
    address: addressToggle?.checked ?? false,
    position: getPositionValue(),
    logoUrl: logoInput?.value.trim() || "",
  }
}

function removeStarterContent() {
  const node = getEditor()
  if (!node || node.dataset.templateStarterChecked === "true") return
  node.dataset.templateStarterChecked = "true"

  const text = node.textContent || ""
  if (!text.includes("{{purchaseOrder.poNumber}}") && !text.includes("{{supplier.name}}")) return

  node.replaceChildren()
  emitEditorInput(node)
}

function headerSignature(state: HeaderState) {
  return JSON.stringify(state)
}

function buildHeader(state: HeaderState) {
  const header = document.createElement("section")
  header.dataset.templateHeader = "true"
  header.contentEditable = "false"
  header.style.display = "grid"
  header.style.gridTemplateColumns = state.logo && state.address ? "1fr 1fr" : "1fr"
  header.style.alignItems = "start"
  header.style.gap = "24px"
  header.style.margin = "0 0 28px 0"
  header.style.padding = "0 0 18px 0"
  header.style.borderBottom = "1px solid #e5e7eb"

  if (state.logo) {
    const logoWrap = document.createElement("div")
    logoWrap.style.display = "flex"
    logoWrap.style.justifyContent = state.position === "right" && !state.address ? "flex-end" : "flex-start"
    logoWrap.style.minHeight = "72px"
    logoWrap.style.alignItems = "center"

    if (state.logoUrl) {
      const image = document.createElement("img")
      image.src = state.logoUrl
      image.alt = "Logo"
      image.style.maxWidth = "160px"
      image.style.maxHeight = "72px"
      image.style.objectFit = "contain"
      image.style.display = "block"
      logoWrap.appendChild(image)
    } else {
      const placeholder = document.createElement("div")
      placeholder.textContent = "Logo"
      placeholder.style.width = "160px"
      placeholder.style.height = "72px"
      placeholder.style.border = "1px dashed #cbd5e1"
      placeholder.style.borderRadius = "12px"
      placeholder.style.display = "flex"
      placeholder.style.alignItems = "center"
      placeholder.style.justifyContent = "center"
      placeholder.style.color = "#64748b"
      placeholder.style.fontSize = "13px"
      placeholder.style.background = "#f8fafc"
      logoWrap.appendChild(placeholder)
    }

    header.appendChild(logoWrap)
  }

  if (state.address) {
    const address = document.createElement("div")
    address.style.textAlign = state.logo ? "right" : state.position
    address.style.fontSize = "13px"
    address.style.lineHeight = "1.65"
    address.style.color = "#475569"
    address.innerHTML = '<strong style="color:#0f172a;font-size:15px">{{organization.name}}</strong><br>{{organization.address}}<br>{{organization.email}}<br>{{organization.phone}}'
    header.appendChild(address)
  }

  return header
}

function ensureTypingArea(editor: HTMLElement) {
  const header = editor.querySelector(headerSelector)
  const afterHeader = header?.nextSibling

  if (!header) {
    if (!editor.textContent?.trim() && !editor.querySelector("br")) {
      editor.appendChild(document.createElement("p"))
    }
    return
  }

  if (!afterHeader) {
    const paragraph = document.createElement("p")
    paragraph.innerHTML = "<br>"
    editor.appendChild(paragraph)
    return
  }

  if (afterHeader.nodeType === Node.TEXT_NODE && !afterHeader.textContent?.trim()) {
    const paragraph = document.createElement("p")
    paragraph.innerHTML = "<br>"
    editor.insertBefore(paragraph, afterHeader.nextSibling)
  }
}

function applyHeader() {
  const editor = getEditor()
  if (!editor) return

  const state = getState()
  const signature = headerSignature(state)
  const existing = editor.querySelector<HTMLElement>(headerSelector)

  if (!state.logo && !state.address) {
    if (existing) {
      existing.remove()
      ensureTypingArea(editor)
      emitEditorInput(editor)
    }
    return
  }

  if (existing?.dataset.signature === signature) {
    ensureTypingArea(editor)
    return
  }

  const next = buildHeader(state)
  next.dataset.signature = signature

  if (existing) existing.replaceWith(next)
  else editor.prepend(next)

  ensureTypingArea(editor)
  emitEditorInput(editor)
}

function addHeaderControls() {
  const logoSection = Array.from(document.querySelectorAll("section")).find((section) => section.textContent?.includes("Logo"))
  if (!logoSection || document.getElementById(headerId)) return

  const panel = document.createElement("div")
  panel.id = headerId
  panel.style.display = "grid"
  panel.style.gap = "10px"
  panel.style.padding = "12px 0"
  panel.style.borderBottom = "1px solid hsl(var(--border))"
  panel.innerHTML = `
    <div style="font-size:13px;font-weight:600">Document header</div>
    <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px">
      <span>Show logo</span>
      <input data-template-toggle="logo" type="checkbox" style="width:16px;height:16px" />
    </label>
    <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px">
      <span>Show address</span>
      <input data-template-toggle="address" type="checkbox" style="width:16px;height:16px" />
    </label>
    <button type="button" data-template-apply-header="true" style="border:1px solid hsl(var(--border));border-radius:8px;padding:8px 10px;background:hsl(var(--background));font-size:13px;font-weight:500;text-align:center">Apply header</button>
    <p style="margin:0;color:hsl(var(--muted-foreground));font-size:12px;line-height:1.4">Turn on logo/address, then click Apply header. It will not rewrite the editor while you type.</p>
  `

  logoSection.prepend(panel)
  panel.querySelector('[data-template-apply-header="true"]')?.addEventListener("click", applyHeader)
}

function initEditor() {
  removeStarterContent()
  addHeaderControls()
}

export function TemplateEditorContentV6({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      addHeaderControls()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-template-apply-header="true"]')) applyHeader()
    }

    document.addEventListener("click", onClick, true)
    window.setTimeout(initEditor, 120)
    window.setTimeout(initEditor, 700)

    return () => {
      observer.disconnect()
      document.removeEventListener("click", onClick, true)
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
          padding: 1.5rem 1.75rem !important;
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
