"use client"

import * as React from "react"

const MONEY_LABELS = [
  "price",
  "selling price",
  "cost",
  "supplier cost",
  "amount",
  "total",
  "subtotal",
  "tax",
  "discount",
  "paid",
  "balance",
  "deposit",
  "converted cost",
]

function textOf(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || ""
}

function cleanLabel(value: string) {
  return value.replace("*", "").replace(/required/i, "").trim().toLowerCase()
}

function isMoneyLabel(value: string) {
  const label = cleanLabel(value)
  return MONEY_LABELS.some((moneyLabel) => label === moneyLabel || label.endsWith(` ${moneyLabel}`))
}

function findCurrencyNear(fieldWrapper: HTMLElement, labelText: string) {
  if (labelText.includes("selling") || labelText === "price") {
    const sellingCurrencyLabel = Array.from(document.querySelectorAll("label"))
      .find((label) => cleanLabel(textOf(label)) === "selling currency")
    const sellingCurrencyWrapper = sellingCurrencyLabel?.parentElement
    const sellingCurrencyInput = sellingCurrencyWrapper?.querySelector("input")
    const sellingCurrencyText = sellingCurrencyInput?.value || sellingCurrencyInput?.getAttribute("value") || textOf(sellingCurrencyWrapper)
    const sellingCurrency = sellingCurrencyText.match(/[A-Z]{3}/)?.[0]
    if (sellingCurrency) return sellingCurrency
  }

  const container = fieldWrapper.closest('[data-slot="card"]') || fieldWrapper.closest(".rounded-xl") || fieldWrapper.parentElement
  const currencyLabel = Array.from(container?.querySelectorAll("label") || [])
    .find((label) => cleanLabel(textOf(label)) === "currency" || cleanLabel(textOf(label)).endsWith(" currency"))
  const currencyWrapper = currencyLabel?.parentElement
  const currencyInput = currencyWrapper?.querySelector("input")
  const currencyText = currencyInput?.value || currencyInput?.getAttribute("value") || textOf(currencyWrapper)
  const localCurrency = currencyText.match(/[A-Z]{3}/)?.[0]
  if (localCurrency) return localCurrency

  const pageCurrency = document.body.textContent?.match(/\b[A-Z]{3}\b/)?.[0]
  return pageCurrency || "ZAR"
}

function enhanceMoneyFields() {
  if (typeof document === "undefined") return

  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("label"))

  labels.forEach((label) => {
    const labelText = cleanLabel(textOf(label))
    if (!isMoneyLabel(labelText)) return

    const fieldWrapper = label.parentElement as HTMLElement | null
    if (!fieldWrapper || fieldWrapper.dataset.moneyInputComponent === "true") return

    const input = fieldWrapper.querySelector<HTMLInputElement>('input[type="number"], input:not([type])')
    if (!input) return
    if (input.closest('[data-slot="button-group"]')) {
      fieldWrapper.dataset.moneyInputComponent = "true"
      return
    }

    const currency = findCurrencyNear(fieldWrapper, labelText)

    const group = document.createElement("div")
    group.setAttribute("role", "group")
    group.dataset.slot = "button-group"
    group.dataset.moneyInputGroup = "true"
    group.className = "group/button-group flex w-full items-stretch *:focus-visible:relative *:focus-visible:z-10 [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none [&>input]:flex-1"

    const currencyButton = document.createElement("button")
    currencyButton.type = "button"
    currencyButton.disabled = true
    currencyButton.tabIndex = -1
    currencyButton.className = "inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-xs disabled:pointer-events-none disabled:opacity-100"
    currencyButton.textContent = currency

    const parent = input.parentElement
    if (!parent) return

    parent.insertBefore(group, input)
    group.append(currencyButton, input)
    fieldWrapper.dataset.moneyInputComponent = "true"
  })
}

export function MoneyFieldEnhancer() {
  React.useEffect(() => {
    enhanceMoneyFields()

    const observer = new MutationObserver(() => enhanceMoneyFields())
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return null
}
