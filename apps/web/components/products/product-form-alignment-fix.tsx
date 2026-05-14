"use client"

import * as React from "react"

function enhanceReadOnlyFields() {
  if (typeof document === "undefined") return

  const nodes = document.querySelectorAll<HTMLDivElement>(
    ".product-form-layout-scope form div > span.sr-only",
  )

  nodes.forEach((labelNode) => {
    const wrapper = labelNode.parentElement as HTMLDivElement | null
    if (!wrapper || wrapper.dataset.readonlyInputEnhanced === "true") return

    const label = labelNode.textContent?.trim() || "Read-only value"
    const value = Array.from(wrapper.childNodes)
      .filter((node) => node !== labelNode)
      .map((node) => node.textContent || "")
      .join("")
      .trim()

    wrapper.dataset.readonlyInputEnhanced = "true"
    wrapper.className = "grid gap-2"
    wrapper.innerHTML = ""

    const labelElement = document.createElement("label")
    labelElement.className = "text-xs font-medium uppercase tracking-wide text-muted-foreground"
    labelElement.textContent = label

    const inputElement = document.createElement("input")
    inputElement.value = value
    inputElement.disabled = true
    inputElement.readOnly = true
    inputElement.className = "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-muted/20 px-3 py-1 text-base font-medium shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-100 md:text-sm"

    wrapper.append(labelElement, inputElement)
  })
}

function textOf(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || ""
}

function baseCurrency() {
  const sellingCurrencyLabel = Array.from(document.querySelectorAll("label"))
    .find((label) => textOf(label).toLowerCase() === "selling currency")
  const wrapper = sellingCurrencyLabel?.parentElement
  const value = wrapper?.querySelector("input")?.getAttribute("value") || wrapper?.querySelector("input")?.value || textOf(wrapper)
  const match = value.match(/[A-Z]{3}/)
  return match?.[0] || "ZAR"
}

function costCurrency(fieldWrapper: HTMLElement) {
  const card = fieldWrapper.closest('[data-slot="card"]') || fieldWrapper.closest(".rounded-xl") || fieldWrapper.parentElement
  const labels = Array.from(card?.querySelectorAll("label") || [])
  const currencyLabel = labels.find((label) => textOf(label).toLowerCase() === "currency")
  const currencyInput = currencyLabel?.parentElement?.querySelector("input")
  const value = currencyInput?.value || currencyInput?.getAttribute("value") || textOf(currencyLabel?.parentElement)
  const match = value.match(/[A-Z]{3}/)
  return match?.[0] || baseCurrency()
}

function enhanceMoneyFields() {
  if (typeof document === "undefined") return

  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>(".product-form-layout-scope form label"))

  labels.forEach((label) => {
    const labelText = textOf(label).replace("*", "").trim().toLowerCase()
    if (labelText !== "selling price" && labelText !== "cost") return

    const fieldWrapper = label.parentElement as HTMLElement | null
    if (!fieldWrapper || fieldWrapper.dataset.moneyButtonGroupEnhanced === "true") return

    const input = fieldWrapper.querySelector<HTMLInputElement>('input[type="number"]')
    if (!input) return

    const currency = labelText === "selling price" ? baseCurrency() : costCurrency(fieldWrapper)
    const group = document.createElement("div")
    group.dataset.slot = "button-group"
    group.className = "inline-flex w-full items-stretch rounded-md shadow-xs"

    const currencyButton = document.createElement("button")
    currencyButton.type = "button"
    currencyButton.disabled = true
    currencyButton.tabIndex = -1
    currencyButton.className = "border-input bg-muted text-muted-foreground inline-flex h-9 shrink-0 items-center justify-center rounded-l-md border px-3 text-sm font-medium disabled:opacity-100"
    currencyButton.textContent = currency

    input.classList.remove("rounded-md")
    input.classList.add("rounded-l-none", "rounded-r-md")

    input.parentElement?.insertBefore(group, input)
    group.append(currencyButton, input)
    fieldWrapper.dataset.moneyButtonGroupEnhanced = "true"
  })
}

function enhanceProductForm() {
  enhanceReadOnlyFields()
  enhanceMoneyFields()
}

export function ProductFormAlignmentFix() {
  React.useEffect(() => {
    enhanceProductForm()

    const observer = new MutationObserver(() => enhanceProductForm())
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
