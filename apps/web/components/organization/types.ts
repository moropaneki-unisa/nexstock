export type OrgMember = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status: string;
  joinedAt?: string;
};

export type OrgRole = {
  name: string;
  description: string;
  permissions: string[];
};

export type OrgPlan = {
  name: string;
  price: number;
  current: boolean;
  description: string;
};

export type CurrencyRate = {
  code: string;
  rateToBase: number;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  skuPrefix?: string | null;
  baseCurrency?: string | null;
  enabledCurrencies?: string[] | null;
  exchangeRates?: CurrencyRate[] | Record<string, number> | null;
  legalName?: string | null;
  tradingName?: string | null;
  registrationNo?: string | null;
  vatNumber?: string | null;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  phone?: string | null;
  billingEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  stats: {
    members: number;
    apiKeys: number;
    webhooks: number;
    integrations: number;
  };
  members: OrgMember[];
  roles: OrgRole[];
  security: {
    strongApiKeys: boolean;
    webhookSigning: boolean;
    twoFactor: boolean;
    auditLog: boolean;
  };
  plans: OrgPlan[];
};

export type OrganizationProfileForm = Pick<
  Organization,
  | "name"
  | "slug"
  | "skuPrefix"
  | "legalName"
  | "tradingName"
  | "registrationNo"
  | "vatNumber"
  | "industry"
  | "companySize"
  | "website"
  | "phone"
  | "billingEmail"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "province"
  | "postalCode"
  | "country"
> & {
  baseCurrency: string;
  enabledCurrencies: string[];
  exchangeRates: CurrencyRate[];
};

export function normalizeExchangeRates(value: Organization["exchangeRates"]): CurrencyRate[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item?.code).map((item) => ({ code: item.code, rateToBase: Number(item.rateToBase || 1) }));
  return Object.entries(value).map(([code, rate]) => ({ code, rateToBase: Number(rate || 1) }));
}

export function toOrganizationProfile(org: Organization): OrganizationProfileForm {
  const baseCurrency = org.baseCurrency || "ZAR";
  const enabledCurrencies = Array.from(new Set([baseCurrency, ...(org.enabledCurrencies ?? [])]));

  return {
    name: org.name,
    slug: org.slug,
    skuPrefix: org.skuPrefix ?? "",
    baseCurrency,
    enabledCurrencies,
    exchangeRates: normalizeExchangeRates(org.exchangeRates),
    legalName: org.legalName ?? "",
    tradingName: org.tradingName ?? "",
    registrationNo: org.registrationNo ?? "",
    vatNumber: org.vatNumber ?? "",
    industry: org.industry ?? "",
    companySize: org.companySize ?? "",
    website: org.website ?? "",
    phone: org.phone ?? "",
    billingEmail: org.billingEmail ?? "",
    addressLine1: org.addressLine1 ?? "",
    addressLine2: org.addressLine2 ?? "",
    city: org.city ?? "",
    province: org.province ?? "",
    postalCode: org.postalCode ?? "",
    country: org.country ?? "",
  };
}
