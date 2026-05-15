"use client"

import * as React from "react"

const MONEY_READ_ONLY_LABELS = new Set(["preferred converted cost", "converted cost"])

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
    ".product-form-layout-scope form div > span.sr-only, form[class*='@container/main'] div > span.sr-only",
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
    wrapper.className = "grid min-w-0 gap-2"
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
      .product-form-layout-scope form,
      form[class*="@container/main"] {
        min-width: 0 !important;
      }

      .product-form-layout-scope form > .grid,
      form[class*="@container/main"] > .grid {
        min-width: 0 !important;
      }

      .product-form-layout-scope form > .grid > main,
      form[class*="@container/main"] > .grid > main,
      .product-form-layout-scope form > .grid > aside,
      form[class*="@container/main"] > .grid > aside {
        min-width: 0 !important;
      }

      @media (min-width: 1280px) {
        .product-form-layout-scope form > .grid,
        form[class*="@container/main"] > .grid {
          grid-template-columns: minmax(0, 1fr) 22rem !important;
        }
      }

      .product-form-layout-scope form main [data-slot="card"],
      form[class*="@container/main"] main [data-slot="card"],
      .product-form-layout-scope form main [data-slot="card-content"],
      form[class*="@container/main"] main [data-slot="card-content"] {
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] input,
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] textarea,
      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] button[role="combobox"],
      form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"] input,
      form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"] textarea,
      form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"] button[role="combobox"] {
        width: 100% !important;
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] [data-slot="button-group"] input,
      form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"] [data-slot="button-group"] input {
        width: 100% !important;
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] > div,
      form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"] > div {
        min-width: 0 !important;
      }

      .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"] .grid.gap-2 input:disabled,
      form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"] .grid.gap-2 input:disabled {
        opacity: 1 !important;
      }

      /* Active supplier row editor: responsive row with compact actions pinned to the far right. */
      .product-form-layout-scope form main div[class*="lg:grid-cols-[1.2fr"],
      form[class*="@container/main"] main div[class*="lg:grid-cols-[1.2fr"] {
        position: relative !important;
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)) !important;
        align-items: start !important;
        overflow: visible !important;
        max-width: 100% !important;
        padding-right: 4.25rem !important;
      }

      .product-form-layout-scope form main div[class*="lg:grid-cols-[1.2fr"] > div,
      form[class*="@container/main"] main div[class*="lg:grid-cols-[1.2fr"] > div {
        min-width: 0 !important;
      }

      .product-form-layout-scope form main div[class*="lg:grid-cols-[1.2fr"] > .flex.gap-2,
      form[class*="@container/main"] main div[class*="lg:grid-cols-[1.2fr"] > .flex.gap-2 {
        position: absolute !important;
        top: 0.75rem !important;
        right: 0.75rem !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 0.25rem !important;
        width: auto !important;
      }

      .product-form-layout-scope form main div[class*="lg:grid-cols-[1.2fr"] > .flex.gap-2 button,
      form[class*="@container/main"] main div[class*="lg:grid-cols-[1.2fr"] > .flex.gap-2 button {
        width: 1.75rem !important;
        height: 1.75rem !important;
        min-width: 1.75rem !important;
        border-radius: 9999px !important;
        padding: 0 !important;
      }

      .product-form-layout-scope form main div[class*="lg:grid-cols-[1.2fr"] > .flex.gap-2 button svg,
      form[class*="@container/main"] main div[class*="lg:grid-cols-[1.2fr"] > .flex.gap-2 button svg {
        width: 0.875rem !important;
        height: 0.875rem !important;
      }

      @media (max-width: 640px) {
        .product-form-layout-scope form main div[class*="lg:grid-cols-[1.2fr"],
        form[class*="@container/main"] main div[class*="lg:grid-cols-[1.2fr"] {
          padding-right: 3.75rem !important;
        }
      }

      @media (max-width: 1279px) {
        .product-form-layout-scope form > .grid,
        form[class*="@container/main"] > .grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
      }

      @media (min-width: 768px) {
        .product-form-layout-scope form main > [data-slot="card"] [data-slot="card-content"].md\\:grid-cols-2 > div,
        form[class*="@container/main"] main > [data-slot="card"] [data-slot="card-content"].md\\:grid-cols-2 > div {
          display: grid !important;
          gap: 1rem !important;
          align-content: start !important;
          min-width: 0 !important;
        }
      }
    `}</style>
  )
}
