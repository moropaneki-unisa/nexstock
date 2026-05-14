const DEFAULT_CURRENCY = "ZAR"

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  AUD: "$",
  CAD: "$",
  NZD: "$",
}

export function normalizeCurrencyCode(value?: string | null, fallback = DEFAULT_CURRENCY) {
  const code = String(value || fallback).trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : fallback
}

export function currencySymbol(value?: string | null, fallback = DEFAULT_CURRENCY) {
  const code = normalizeCurrencyCode(value, fallback)
  return CURRENCY_SYMBOLS[code] || code
}

export function numberValue(value: unknown) {
  const next = Number(value ?? 0)
  return Number.isFinite(next) ? next : 0
}

export function formatMoney(value: unknown, currency = DEFAULT_CURRENCY) {
  const code = normalizeCurrencyCode(currency)
  const symbol = currencySymbol(code)
  const amount = new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value))
  return `${symbol}${amount}`
}
