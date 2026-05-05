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

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  skuPrefix?: string | null;
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
>;

export function toOrganizationProfile(org: Organization): OrganizationProfileForm {
  return {
    name: org.name,
    slug: org.slug,
    skuPrefix: org.skuPrefix ?? "",
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
