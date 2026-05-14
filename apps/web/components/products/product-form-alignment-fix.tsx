"use client"

import * as React from "react"

const MONEY_READ_ONLY_LABELS = new Set(["preferred converted cost", "converted cost"])

function textOf(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || ""
}

function normalizeLabel(value: string) {
  return value.replace("*", "").replace(/required/i, "").trim().toLowerCase()
}

function numericMoneyValue(value: string) {
  const cleaned = value.replace(/[^0-9.-]+/g, "")
  const next = Number(cleaned)
  return Number.isFinite(next) ? String(next) : "0"
}

function enhanceReadOnlyFields() {
  if (typeof document === "undefined") return

  const nodes = document.querySelectorAll<HTMLSpanElement>(
    ".product-form-layout-scope form div > span.sr-only",
  )

  nodes.forEach((labelNode) => {
    const wrapper = labelNode.parentElement as HTMLDivElement | null
    if (!wrapper || wrapper.dataset.readonlyInputEnhanced === "true") return

    const label = labelNode.textContent?.trim() || "Read-only value"
    const normalizedLabel = normalizeLabel(label)
    const rawValue = Array.from(wrapper.childNodes)
      .filter((node) => node !== labelNode)
      .map((node) => node.textContent || "")
      .join("")
      .trim()
    const isMoneyValue = MONEY_READ_ONLY_LABELS.has(normalizedLabel)

    wrapper.dataset.readonlyInputEnhanced = "true"
    wrapper.className = "grid gap-2"
    wrapper.innerHTML = ""

    const labelElement = document.createElement("label")
    labelElement.className = "text-xs font-medium uppercase tracking-wide text-muted-foreground"
    labelElement.textContent = label

    const inputElement = document.createElement("input")
    inputElement.value = isMoneyValue ? numericMoneyValue(rawValue) : rawValue
    inputElement.disabled = true
    inputElement.readOnly = true
    if (isMoneyValue) {
      inputElement.type = "number"
      inputElement.step = "0.01"
      inputElement.min = "0"
      inputElement.dataset.moneyReadonly = "true"
    }
    inputElement.className = "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-muted/20 px-3 py-1 text-base font-medium shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100 md:text-sm"

    wrapper.append(labelElement, inputElement)
  })
}

export function ProductFormAlignmentFix() {
  React.useEffect(() => {
    enhanceReadOnlyFields()

    const observer = new MutationObserver(() => enhanceReadOnlyFields())
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return (
    <style>{`
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] input,
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] textarea,
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] button[role="combobox"] {
        width: 100% !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] [data-slot="button-group"] input {
        width: 100% !important;
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] > div {
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] .grid.gap-2 input:disabled {
        opacity: 1 !important;
      }

      @media (min-width: 768px) {
        .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"].md\\:grid-cols-2 > div {
          display: grid !important;
          gap: 1rem !important;
          align-content: start !important;
        }
      }
    `}</style>
  )
}
