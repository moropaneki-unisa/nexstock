"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { apiFetch } from "@/lib/api";

export default function OrganizationPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  async function load() {
    const data = await apiFetch("/api/organization");
    setOrg(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function invite() {
    if (!email) return;
    await apiFetch("/api/organization/invite", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
    setEmail("");
    load();
  }

  if (loading) return <PageShell>Loading...</PageShell>;

  return (
    <PageShell className="space-y-5">
      <PageHeader title={org.name} description="Organization management" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div>Name: {org.name}</div>
          <div>Slug: {org.slug}</div>
          <div>Plan: {org.plan}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {org.members.map((m: any) => (
            <div key={m.id} className="flex justify-between border p-2 rounded">
              <div>
                <div>{m.name || m.email}</div>
                <div className="text-xs">{m.email}</div>
              </div>
              <Badge>{m.role}</Badge>
            </div>
          ))}

          <div className="flex gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="border px-2">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={invite}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
