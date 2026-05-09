"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, CreditCard, Edit3, KeyRound, Loader2, LockKeyhole, ShieldCheck, Users, Webhook } from "lucide-react";

import { AdminRouteGuard } from "@/components/auth/admin-route-guard";
import { OrganizationBillingSection } from "@/components/organization/billing-section";
import { OrganizationUsersSection } from "@/components/organization/users-section";
import { Organization } from "@/components/organization/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

export default function OrganizationPage() {
  return (
    <AdminRouteGuard>
      <OrganizationContent />
    </AdminRouteGuard>
  );
}

function OrganizationContent() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [memberAction, setMemberAction] = useState<string | null>(null);
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Organization>("/api/organization");
      setOrg(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (!reference) return;
    apiFetch(`/api/billing/paystack/verify/${reference}`)
      .then(() => {
        setNotice("Payment verified and plan updated.");
        void load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Payment verification failed"));
  }, []);

  async function invite() {
    if (!email.trim()) {
      setError("Enter an email address before inviting a user.");
      return;
    }
    setMemberAction("invite");
    setError(null);
    try {
      await apiFetch("/api/organization/invite", { method: "POST", body: JSON.stringify({ email, role }) });
      setEmail("");
      setNotice("User invited successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setMemberAction(null);
    }
  }

  async function changeRole(memberId: string, nextRole: string) {
    setMemberAction(memberId);
    setError(null);
    try {
      await apiFetch(`/api/organization/member/${memberId}/role`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setMemberAction(null);
    }
  }

  async function removeMember(memberId: string) {
    if (!window.confirm("Remove this member from the organization?")) return;
    setMemberAction(memberId);
    setError(null);
    try {
      await apiFetch(`/api/organization/member/${memberId}`, { method: "DELETE" });
      setNotice("Member removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setMemberAction(null);
    }
  }

  async function upgrade(plan: string) {
    setBillingPlan(plan);
    setError(null);
    try {
      const data = await apiFetch<{ authorization_url: string }>("/api/billing/paystack/initialize", { method: "POST", body: JSON.stringify({ plan }) });
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Paystack checkout");
      setBillingPlan(null);
    }
  }

  if (loading && !org) {
    return <PageShell><div className="border bg-card/95 p-8 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading organization...</div></PageShell>;
  }

  if (!org) {
    return <PageShell><div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error ?? "Organization could not be loaded."}</div></PageShell>;
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Admin"
        title={org.name}
        description="Manage company profile, users, roles, permissions, security, and Paystack billing from one real-data workspace."
        actions={<Button asChild><Link href="/organization/edit"><Edit3 className="h-4 w-4" />Edit company profile</Link></Button>}
      />

      {notice && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={Users} label="Members" value={org.stats.members} />
          <Metric icon={KeyRound} label="API keys" value={org.stats.apiKeys} />
          <Metric icon={Webhook} label="Webhooks" value={org.stats.webhooks} />
          <Metric icon={CreditCard} label="Plan" value={org.plan} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={Building2} title="Company profile" description="Business information used for billing, onboarding, account management, and client readiness." action={<Button asChild variant="outline" size="sm"><Link href="/organization/edit"><Edit3 className="h-4 w-4" />Edit</Link></Button>} />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="divide-y">
                <ProfileItem label="Workspace name" value={org.name} />
                <ProfileItem label="Slug" value={org.slug} />
                <ProfileItem label="Legal name" value={org.legalName} />
                <ProfileItem label="Trading name" value={org.tradingName} />
                <ProfileItem label="Registration no." value={org.registrationNo} />
                <ProfileItem label="VAT number" value={org.vatNumber} />
              </div>
              <div className="divide-y">
                <ProfileItem label="Industry" value={org.industry} />
                <ProfileItem label="Company size" value={org.companySize} />
                <ProfileItem label="Website" value={org.website} />
                <ProfileItem label="Phone" value={org.phone} />
                <ProfileItem label="Billing email" value={org.billingEmail} />
                <ProfileItem label="SKU prefix" value={org.skuPrefix} />
              </div>
            </div>
            <div className="border-t"><ProfileItem label="Address" value={[org.addressLine1, org.addressLine2, org.city, org.province, org.postalCode, org.country].filter(Boolean).join(", ")} /></div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={Users} title="Users and access" />
            <div className="border-t p-5"><OrganizationUsersSection members={org.members} email={email} role={role} action={memberAction} setEmail={setEmail} setRole={setRole} invite={invite} changeRole={changeRole} removeMember={removeMember} /></div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Roles and permissions" />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">{org.roles.map((roleItem) => <div key={roleItem.name} className="p-5"><div className="flex items-center justify-between"><h3 className="font-semibold capitalize">{roleItem.name}</h3><Badge>Role</Badge></div><p className="mt-2 text-sm text-muted-foreground">{roleItem.description}</p><div className="mt-4 flex flex-wrap gap-2">{roleItem.permissions.map((permission) => <Badge key={permission} variant="outline">{permission}</Badge>)}</div></div>)}</div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={LockKeyhole} title="Security" />
            <div className="divide-y border-t"><Security label="Strong API keys" ready={org.security.strongApiKeys} /><Security label="Webhook signing" ready={org.security.webhookSigning} /><Security label="Two-factor auth" ready={org.security.twoFactor} /><Security label="Audit log" ready={org.security.auditLog} /></div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={CreditCard} title="Plan and billing" description="Paystack test-mode checkout is used for upgrades." />
            <div className="border-t p-5"><OrganizationBillingSection plans={org.plans} loadingPlan={billingPlan} onUpgrade={upgrade} /></div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description, action }: { icon: any; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return <div className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold capitalize">{value}</p></div><span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function ProfileItem({ label, value }: { label: string; value?: string | null }) {
  return <div className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-medium text-foreground">{value || "Not set"}</p></div>;
}

function Security({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center justify-between px-4 py-3 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <LockKeyhole className="h-4 w-4 text-muted-foreground" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Enabled" : "Not enabled"}</Badge></div>;
}
