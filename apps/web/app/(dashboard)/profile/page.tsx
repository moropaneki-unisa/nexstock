"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

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
        <div className="rounded-2xl border bg-card/95 p-8 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading profile...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6 pb-10">
      <PageHeader
        eyebrow="Account"
        title="Edit profile"
        description="Update your personal details and password for your NexStock account."
        actions={
          <Button onClick={saveProfile} disabled={saving || loading} className="rounded-2xl shadow-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        }
      />

      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[1fr_23rem]">
        <main className="space-y-6">
          <Card className="pro-card rounded-[1.5rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound className="h-5 w-5" /> Personal information
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">This information is shown to your team inside the workspace.</p>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Full name" description="Displayed on your profile and workspace member list.">
                <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" className="rounded-2xl" />
              </Field>
              <Field label="Email address" description="Used for sign in and notifications.">
                <Input value={profile?.email ?? ""} readOnly className="rounded-2xl bg-muted/40" />
              </Field>
            </CardContent>
          </Card>

          <Card className="pro-card rounded-[1.5rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LockKeyhole className="h-5 w-5" /> Password
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">Leave these fields empty if you do not want to change your password.</p>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:grid-cols-3">
              <Field label="Current password" description="Required for password changes.">
                <Input type="password" value={form.currentPassword} onChange={(event) => update("currentPassword", event.target.value)} className="rounded-2xl" />
              </Field>
              <Field label="New password" description="Use at least 8 characters.">
                <Input type="password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} className="rounded-2xl" />
              </Field>
              <Field label="Confirm password" description="Must match the new password.">
                <Input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} className="rounded-2xl" />
              </Field>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-6">
          <Card className="pro-card rounded-[1.5rem]">
            <CardHeader>
              <CardTitle className="text-lg">Account status</CardTitle>
              <p className="text-sm text-muted-foreground">Your current account and workspace details.</p>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <StatusRow label="Email" value={profile?.email ?? "Not available"} />
              <StatusRow label="Email status" value={profile?.emailVerifiedAt ? "Verified" : "Not verified"} success={Boolean(profile?.emailVerifiedAt)} />
              <StatusRow label="Workspace" value={profile?.organization?.name ?? "Not assigned"} />
              <StatusRow label="Role" value={profile?.organization?.role ?? "Member"} />
            </CardContent>
          </Card>

          <Card className="pro-card rounded-[1.5rem]">
            <CardContent className="flex gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold tracking-tight">Security tip</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Use a strong password that you do not reuse on other services.</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </PageShell>
  );
}

function Field({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function StatusRow({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/70 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium capitalize">
        {success && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        <Badge variant={success ? "default" : "secondary"} className="max-w-[12rem] truncate rounded-full">{value}</Badge>
      </span>
    </div>
  );
}
