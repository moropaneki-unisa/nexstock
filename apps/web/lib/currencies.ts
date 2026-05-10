export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

export const DEFAULT_CURRENCY = "ZAR";

export const currencyOptions: CurrencyOption[] = [
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "BWP", name: "Botswana Pula", symbol: "P" },
  { code: "NAD", name: "Namibian Dollar", symbol: "N$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
];

export function normalizeCurrencyCode(code?: string | null) {
  const value = String(code || DEFAULT_CURRENCY).trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : DEFAULT_CURRENCY;
}

export function getCurrencyLabel(code?: string | null) {
  const normalizedCode = normalizeCurrencyCode(code);
  const option = currencyOptions.find((currency) => currency.code === normalizedCode);
  return option ? `${option.code} · ${option.name}` : normalizedCode;
}

export function getCurrencySymbol(code?: string | null) {
  const normalizedCode = normalizeCurrencyCode(code);
  return currencyOptions.find((currency) => currency.code === normalizedCode)?.symbol ?? normalizedCode;
}

export function normalizeCurrencyList(baseCurrency: string, currencies: string[]) {
  return Array.from(new Set([normalizeCurrencyCode(baseCurrency), ...currencies.map(normalizeCurrencyCode)].filter(Boolean))).sort();
}

export function formatMoney(value: string | number | null | undefined, currency?: string | null, options?: Intl.NumberFormatOptions) {
  const currencyCode = normalizeCurrencyCode(currency);
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;
  const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
  const number = new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits,
    ...options,
    style: "decimal",
  }).format(safeValue);

  return `${getCurrencySymbol(currencyCode)} ${number}`;
}

export function formatCurrencyAmount(value: string | number | null | undefined, currency?: string | null) {
  return `${getCurrencySymbol(currency)} ${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
