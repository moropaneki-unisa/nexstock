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

function removeOldLogoOnlyPreview(editor: HTMLElement) {
  editor.querySelectorAll('[data-template-logo="true"]').forEach((node) => node.remove())
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

function syncHeader(force = false) {
  const editor = getEditor()
  if (!editor) return

  removeOldLogoOnlyPreview(editor)
  const state = getState()
  const signature = headerSignature(state)
  const existing = editor.querySelector<HTMLElement>('[data-template-header="true"]')

  if (!state.logo && !state.address) {
    if (existing) {
      existing.remove()
      emitEditorInput(editor)
    }
    return
  }

  if (!force && existing?.dataset.signature === signature) return

  const next = buildHeader(state)
  next.dataset.signature = signature

  if (existing) existing.replaceWith(next)
  else editor.prepend(next)

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
    <p style="margin:0;color:hsl(var(--muted-foreground));font-size:12px;line-height:1.4">Turn these on to reserve a clean header area at the top of the PDF.</p>
  `

  logoSection.prepend(panel)
  panel.addEventListener("change", () => syncHeader(true))
}

function refreshOnce() {
  removeStarterContent()
  addHeaderControls()
  syncHeader()
}

export function TemplateEditorContentV6({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  React.useEffect(() => {
    let queued = false
    const queueRefresh = (force = false) => {
      if (queued) return
      queued = true
      window.requestAnimationFrame(() => {
        queued = false
        removeStarterContent()
        addHeaderControls()
        syncHeader(force)
      })
    }

    const observer = new MutationObserver(() => queueRefresh(false))
    observer.observe(document.body, { childList: true, subtree: true })

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[contenteditable="true"]')) return
      queueRefresh(true)
    }

    const onClick = () => window.setTimeout(() => queueRefresh(true), 80)

    document.addEventListener("input", onInput, true)
    document.addEventListener("change", onInput, true)
    document.addEventListener("click", onClick, true)
    window.setTimeout(refreshOnce, 120)
    window.setTimeout(refreshOnce, 700)

    return () => {
      observer.disconnect()
      document.removeEventListener("input", onInput, true)
      document.removeEventListener("change", onInput, true)
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
