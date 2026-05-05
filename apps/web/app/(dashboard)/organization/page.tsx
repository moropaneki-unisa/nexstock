"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, CreditCard, KeyRound, LockKeyhole, Mail, Plus, ShieldCheck, UserCog, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";

const initialMembers = [
  { id: "1", name: "Zack", email: "admin@inventoryhub.local", role: "Owner", status: "Active", lastActive: "Today" },
  { id: "2", name: "Operations", email: "ops@inventoryhub.local", role: "Admin", status: "Invited", lastActive: "Pending" },
];

const roles = [
  { name: "Owner", description: "Full organization, billing, security, data, and user management access.", permissions: ["Manage billing", "Manage users", "Manage integrations", "Manage products", "Manage API keys"] },
  { name: "Admin", description: "Can manage products, integrations, API keys, webhooks, and settings.", permissions: ["Manage products", "Manage integrations", "Manage API keys", "Manage webhooks"] },
  { name: "Operator", description: "Can create, edit, import, export, and sync products.", permissions: ["Manage products", "Import/export", "Run sync"] },
  { name: "Viewer", description: "Read-only access to dashboard, products, and logs.", permissions: ["View products", "View dashboard", "View logs"] },
];

const plans = [
  { name: "Free", price: "$0", description: "Test inventory records and basic product management.", current: false },
  { name: "Pro", price: "$29", description: "Integrations, import/export, webhooks, API keys, and team access.", current: true },
  { name: "Business", price: "$99", description: "Advanced roles, audit logs, higher limits, priority sync, and support.", current: false },
];

export default function OrganizationPage() {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Operator");
  const [notice, setNotice] = useState<string | null>(null);

  function inviteMember() {
    const email = inviteEmail.trim();
    if (!email) {
      setNotice("Enter an email address before inviting a user.");
      return;
    }

    setMembers((current) => [
      ...current,
      { id: `${Date.now()}`, name: email.split("@")[0], email, role: inviteRole, status: "Invited", lastActive: "Pending" },
    ]);
    setInviteEmail("");
    setNotice(`Invitation prepared for ${email}. Backend email delivery can be connected next.`);
  }

  return (
    <PageShell className="space-y-5 pb-10">
      <PageHeader
        eyebrow="Admin"
        title="Organization"
        description="Manage the workspace profile, users, roles, permissions, security controls, and plan. This is the SaaS admin area separate from product records and integrations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl bg-background/70">
              <Link href="/settings"><UserCog className="h-4 w-4" /> Workspace settings</Link>
            </Button>
            <Button className="rounded-xl shadow-sm" onClick={inviteMember}><Plus className="h-4 w-4" /> Invite user</Button>
          </div>
        }
      />

      {notice && <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">{notice}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetric icon={Building2} label="Organization" value="InventoryHub" helper="Workspace profile" />
        <AdminMetric icon={Users} label="Users" value={members.length} helper="Active and invited" />
        <AdminMetric icon={ShieldCheck} label="Roles" value={roles.length} helper="Permission sets" />
        <AdminMetric icon={CreditCard} label="Plan" value="Pro" helper="Current tier" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-5">
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Organization profile</CardTitle>
              <p className="text-sm text-muted-foreground">Business identity for billing, audit logs, users, and workspace ownership.</p>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Organization name"><Input defaultValue="InventoryHub Workspace" className="rounded-xl" /></Field>
              <Field label="Workspace slug"><Input defaultValue="inventoryhub" className="rounded-xl font-mono" /></Field>
              <Field label="Billing email"><Input defaultValue="billing@inventoryhub.local" className="rounded-xl" /></Field>
              <Field label="Region"><Input defaultValue="South Africa" className="rounded-xl" /></Field>
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" />Users and access</CardTitle>
              <p className="text-sm text-muted-foreground">Invite users and assign roles. Connect this page to auth/team APIs when backend user management is added.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1fr_12rem_auto]">
                <Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="user@company.com" className="rounded-xl" />
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm">
                  {roles.map((role) => <option key={role.name} value={role.name}>{role.name}</option>)}
                </select>
                <Button type="button" onClick={inviteMember} className="rounded-xl"><Mail className="h-4 w-4" />Invite</Button>
              </div>

              <div className="divide-y rounded-xl border">
                {members.map((member) => (
                  <div key={member.id} className="grid gap-3 p-4 md:grid-cols-[1fr_10rem_8rem_8rem] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{member.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant={member.role === "Owner" ? "default" : "secondary"} className="w-fit rounded-full">{member.role}</Badge>
                    <Badge variant={member.status === "Active" ? "default" : "outline"} className="w-fit rounded-full">{member.status}</Badge>
                    <p className="text-sm text-muted-foreground">{member.lastActive}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5" />Roles and permissions</CardTitle>
              <p className="text-sm text-muted-foreground">Clear permission model for a real SaaS team workspace.</p>
            </CardHeader>
            <CardContent className="grid gap-3 p-5 md:grid-cols-2">
              {roles.map((role) => (
                <div key={role.name} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{role.name}</h3>
                    <Badge variant={role.name === "Owner" ? "default" : "secondary"} className="rounded-full">Role</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.map((permission) => <Badge key={permission} variant="outline" className="rounded-full">{permission}</Badge>)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-5">
          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><LockKeyhole className="h-5 w-5" />Security</CardTitle><p className="text-sm text-muted-foreground">Admin controls expected for production teams.</p></CardHeader>
            <CardContent className="space-y-3">
              <SecurityItem label="Two-factor authentication" status="Planned" />
              <SecurityItem label="Webhook signing" status="Enabled" ready />
              <SecurityItem label="Strong API keys" status="Enabled" ready />
              <SecurityItem label="Audit log" status="Planned" />
              <SecurityItem label="Session controls" status="Planned" />
            </CardContent>
          </Card>

          <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" />Plan and upgrade</CardTitle><p className="text-sm text-muted-foreground">Billing and upgrade controls for the SaaS workspace.</p></CardHeader>
            <CardContent className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.name} className={`rounded-xl border p-4 ${plan.current ? "border-primary/30 bg-primary/5" : "bg-background/70"}`}>
                  <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{plan.name}</h3>{plan.current && <Badge className="rounded-full">Current</Badge>}</div>
                  <p className="mt-2 text-2xl font-semibold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                  {!plan.current && <Button type="button" variant="outline" className="mt-3 w-full rounded-xl">Upgrade</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function AdminMetric({ icon: Icon, label, value, helper }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; helper: string }) {
  return <Card className="rounded-[1.25rem] border-border/80 bg-card/95 shadow-sm"><CardContent className="flex items-start justify-between gap-4 p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></CardContent></Card>;
}

function SecurityItem({ label, status, ready }: { label: string; status: string; ready?: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 px-3 py-2 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <KeyRound className="h-4 w-4 text-muted-foreground" />}{label}</span><Badge variant={ready ? "default" : "secondary"} className="rounded-full">{status}</Badge></div>;
}
