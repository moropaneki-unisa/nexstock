"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, CreditCard, KeyRound, Loader2, LockKeyhole, Save, ShieldCheck, Users, Webhook } from "lucide-react";

import { OrganizationBillingSection } from "@/components/organization/billing-section";
import { OrganizationProfileSection } from "@/components/organization/profile-section";
import { OrganizationUsersSection } from "@/components/organization/users-section";
import { Organization, OrganizationProfileForm, toOrganizationProfile } from "@/components/organization/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<OrganizationProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setProfile(toOrganizationProfile(data));
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

  const dirty = useMemo(() => {
    if (!org || !profile) return false;
    return JSON.stringify(toOrganizationProfile(org)) !== JSON.stringify(profile);
  }, [org, profile]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/organization", { method: "PATCH", body: JSON.stringify(profile) });
      setNotice("Company profile saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company profile");
    } finally {
      setSaving(false);
    }
  }

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
    return <PageShell><div className="rounded-[1.25rem] border bg-card/95 p-8 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading organization...</div></PageShell>;
  }

  if (!org || !profile) {
    return <PageShell><div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error ?? "Organization could not be loaded."}</div></PageShell>;
  }

  return (
    <PageShell className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Admin"
        title={org.name}
        description="Manage company profile, users, roles, permissions, security, and Paystack billing from one real-data workspace."
        actions={<Button onClick={saveProfile} disabled={!dirty || saving} className="rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{dirty ? "Save company profile" : "Profile saved"}</Button>}
      />

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Users} label="Members" value={org.stats.members} />
        <Metric icon={KeyRound} label="API keys" value={org.stats.apiKeys} />
        <Metric icon={Webhook} label="Webhooks" value={org.stats.webhooks} />
        <Metric icon={CreditCard} label="Plan" value={org.plan} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-5">
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Company profile</CardTitle><p className="text-sm text-muted-foreground">Business information used for billing, onboarding, account management, and client readiness.</p></CardHeader>
            <CardContent className="p-5"><OrganizationProfileSection profile={profile} setProfile={setProfile} /></CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" />Users and access</CardTitle></CardHeader>
            <CardContent className="p-5"><OrganizationUsersSection members={org.members} email={email} role={role} action={memberAction} setEmail={setEmail} setRole={setRole} invite={invite} changeRole={changeRole} removeMember={removeMember} /></CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" />Roles and permissions</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-5 md:grid-cols-2">{org.roles.map((roleItem) => <div key={roleItem.name} className="rounded-xl border bg-background/70 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold capitalize">{roleItem.name}</h3><Badge className="rounded-full">Role</Badge></div><p className="mt-2 text-sm text-muted-foreground">{roleItem.description}</p><div className="mt-4 flex flex-wrap gap-2">{roleItem.permissions.map((permission) => <Badge key={permission} variant="outline" className="rounded-full">{permission}</Badge>)}</div></div>)}</CardContent>
          </Card>
        </main>

        <aside className="space-y-5">
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><LockKeyhole className="h-5 w-5" />Security</CardTitle></CardHeader>
            <CardContent className="space-y-3"><Security label="Strong API keys" ready={org.security.strongApiKeys} /><Security label="Webhook signing" ready={org.security.webhookSigning} /><Security label="Two-factor auth" ready={org.security.twoFactor} /><Security label="Audit log" ready={org.security.auditLog} /></CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" />Plan and billing</CardTitle><p className="text-sm text-muted-foreground">Paystack test-mode checkout is used for upgrades.</p></CardHeader>
            <CardContent><OrganizationBillingSection plans={org.plans} loadingPlan={billingPlan} onUpgrade={upgrade} /></CardContent>
          </Card>
        </aside>
      </section>
    </PageShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold capitalize">{value}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></CardContent></Card>;
}

function Security({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border bg-background/70 px-3 py-2 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <LockKeyhole className="h-4 w-4 text-muted-foreground" />}{label}</span><Badge variant={ready ? "default" : "secondary"} className="rounded-full">{ready ? "Enabled" : "Not enabled"}</Badge></div>;
}
