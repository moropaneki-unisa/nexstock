"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { CheckCircle2, Clock3, Loader2, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";

type UserProfile = {
  id: string;
  email: string;
  name?: string | null;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: string;
  } | null;
};

type ProfileForm = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

import { apiFetch } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: "", currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserProfile>("/api/users/me");
      setProfile(data);
      setForm((current) => ({ ...current, name: data.name ?? "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
    setError(null);
  }

  async function saveProfile() {
    setSaving(true);
    setNotice(null);
    setError(null);

    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (form.newPassword.length < 8) {
        setError("New password must be at least 8 characters.");
        setSaving(false);
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError("New password and confirmation do not match.");
        setSaving(false);
        return;
      }
      if (!form.currentPassword) {
        setError("Enter your current password to change your password.");
        setSaving(false);
        return;
      }
    }

    try {
      const payload: Record<string, string | null> = { name: form.name.trim() || null };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const data = await apiFetch<UserProfile>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setProfile(data);
      setForm({ name: data.name ?? "", currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !profile) {
    return (
      <PageShell>
        <div className="border bg-card/95 p-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading profile...
        </div>
      </PageShell>
    );
  }

  const displayName = profile?.name || profile?.email?.split("@")[0] || "User";

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Account"
        title="Edit profile"
        description="Update your personal details and password for your NexStock account."
        actions={
          <Button onClick={saveProfile} disabled={saving || loading} className="rounded-xl shadow-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        }
      />

      {notice && <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <section className="border bg-card/95">
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric icon={UserRound} label="Profile" value={displayName} helper="Account identity" />
          <Metric icon={ShieldCheck} label="Email status" value={profile?.emailVerifiedAt ? "Verified" : "Review"} helper={profile?.email ?? "Not available"} />
          <Metric icon={LockKeyhole} label="Password" value="Protected" helper="Credentials enabled" />
          <Metric icon={Building2Icon} label="Workspace" value={profile?.organization?.role ?? "Member"} helper={profile?.organization?.name ?? "Not assigned"} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <main className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={UserRound} title="Personal information" description="This information is shown to your team inside the workspace." />
            <div className="grid divide-y border-t md:grid-cols-2 md:divide-x md:divide-y-0">
              <Field label="Full name" description="Displayed on your profile and workspace member list.">
                <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" className="rounded-xl" />
              </Field>
              <Field label="Email address" description="Used for sign in and notifications.">
                <Input value={profile?.email ?? ""} readOnly className="rounded-xl bg-muted/40" />
              </Field>
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={LockKeyhole} title="Password" description="Leave these fields empty if you do not want to change your password." />
            <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
              <Field label="Current password" description="Required for password changes.">
                <Input type="password" value={form.currentPassword} onChange={(event) => update("currentPassword", event.target.value)} className="rounded-xl" />
              </Field>
              <Field label="New password" description="Use at least 8 characters.">
                <Input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} className="rounded-xl" />
              </Field>
              <Field label="Confirm password" description="Must match the new password.">
                <Input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} className="rounded-xl" />
              </Field>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="border bg-card/95">
            <SectionHeader icon={ShieldCheck} title="Account status" description="Your current account and workspace details." />
            <div className="divide-y border-t">
              <StatusRow label="Email" value={profile?.email ?? "Not available"} />
              <StatusRow label="Email status" value={profile?.emailVerifiedAt ? "Verified" : "Not verified"} success={Boolean(profile?.emailVerifiedAt)} />
              <StatusRow label="Workspace" value={profile?.organization?.name ?? "Not assigned"} />
              <StatusRow label="Role" value={profile?.organization?.role ?? "Member"} />
            </div>
          </section>

          <section className="border bg-card/95">
            <SectionHeader icon={LockKeyhole} title="Security" />
            <div className="border-t p-5">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">Security tip</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Use a strong password that you do not reuse on other services.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <ReadinessLine label="Profile loaded" ready={Boolean(profile)} />
                <ReadinessLine label="Email verified" ready={Boolean(profile?.emailVerifiedAt)} />
                <ReadinessLine label="Workspace assigned" ready={Boolean(profile?.organization)} />
              </div>
            </div>
          </section>
        </aside>
      </section>
    </PageShell>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: ComponentType<{ className?: string }>; title: string; description?: string }) {
  return <div className="flex flex-row items-start justify-between gap-4 p-5"><div><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Icon className="h-5 w-5" />{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div></div>;
}

function Metric({ icon: Icon, label, value, helper }: { icon: ComponentType<{ className?: string }>; label: string; value: string; helper: string }) {
  return <div className="flex items-center justify-between p-4"><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span></div>;
}

function Field({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return <div className="p-4"><Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p><div className="mt-3">{children}</div></div>;
}

function StatusRow({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="flex min-w-0 items-center gap-2 text-right font-medium capitalize">{success && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}<Badge variant={success ? "default" : "secondary"} className="max-w-[12rem] truncate">{value}</Badge></span></div>;
}

function ReadinessLine({ label, ready }: { label: string; ready: boolean }) {
  return <div className="flex items-center justify-between border bg-background/70 px-3 py-2 text-sm"><span className="flex items-center gap-2">{ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}{label}</span><Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Review"}</Badge></div>;
}

function Building2Icon({ className }: { className?: string }) {
  return <UserRound className={className} />;
}
