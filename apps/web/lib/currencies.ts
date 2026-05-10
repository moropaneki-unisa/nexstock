export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

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

export function getCurrencyLabel(code?: string | null) {
  const option = currencyOptions.find((currency) => currency.code === code);
  return option ? `${option.code} · ${option.name}` : code || "Not set";
}

export function getCurrencySymbol(code?: string | null) {
  return currencyOptions.find((currency) => currency.code === code)?.symbol ?? code ?? "";
}

export function normalizeCurrencyList(baseCurrency: string, currencies: string[]) {
  return Array.from(new Set([baseCurrency, ...currencies].filter(Boolean))).sort();
}
