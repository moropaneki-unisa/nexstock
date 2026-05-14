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
  "preferred converted cost",
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

function inputValue(wrapper: Element | null) {
  const input = wrapper?.querySelector("input")
  return input?.value || input?.getAttribute("value") || textOf(wrapper)
}

function findBaseCurrency() {
  const sellingCurrencyLabel = Array.from(document.querySelectorAll("label"))
    .find((label) => cleanLabel(textOf(label)) === "selling currency")
  const value = inputValue(sellingCurrencyLabel?.parentElement)
  return value.match(/[A-Z]{3}/)?.[0] || "ZAR"
}

function findCurrencyNear(fieldWrapper: HTMLElement, labelText: string) {
  if (labelText.includes("selling") || labelText.includes("converted") || labelText === "price") return findBaseCurrency()

  const row = fieldWrapper.closest('[data-slot="card-content"]') || fieldWrapper.closest(".rounded-xl") || fieldWrapper.parentElement
  const currencyLabel = Array.from(row?.querySelectorAll("label") || [])
    .find((label) => cleanLabel(textOf(label)) === "currency")
  const localCurrency = inputValue(currencyLabel?.parentElement).match(/[A-Z]{3}/)?.[0]
  return localCurrency || findBaseCurrency()
}

function removeBadLegacyMoneyGroups() {
  document.querySelectorAll<HTMLElement>('[data-slot="button-group"] button').forEach((button) => {
    if (button.textContent?.trim().toUpperCase() === "URL") {
      const group = button.parentElement
      const input = group?.querySelector("input")
      const parent = group?.parentElement
      if (group && input && parent) {
        parent.insertBefore(input, group)
        group.remove()
        parent.removeAttribute("data-money-button-group-enhanced")
        parent.removeAttribute("data-money-input-component")
      }
    }
  })
}

function enhanceMoneyFields() {
  if (typeof document === "undefined") return
  removeBadLegacyMoneyGroups()

  const labels = Array.from(document.querySelectorAll<HTMLLabelElement>("label"))

  labels.forEach((label) => {
    const labelText = cleanLabel(textOf(label))
    if (!isMoneyLabel(labelText)) return

    const fieldWrapper = label.parentElement as HTMLElement | null
    if (!fieldWrapper || fieldWrapper.dataset.moneyInputComponent === "true") return

    const input = fieldWrapper.querySelector<HTMLInputElement>('input[type="number"]')
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
