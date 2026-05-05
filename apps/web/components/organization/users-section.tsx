"use client";

import { Loader2, Mail, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrgMember } from "./types";

export function OrganizationUsersSection({
  members,
  email,
  role,
  action,
  setEmail,
  setRole,
  invite,
  changeRole,
  removeMember,
}: {
  members: OrgMember[];
  email: string;
  role: string;
  action: string | null;
  setEmail: (value: string) => void;
  setRole: (value: string) => void;
  invite: () => void;
  changeRole: (memberId: string, role: string) => void;
  removeMember: (memberId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1fr_10rem_auto]">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" className="rounded-xl" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-xl border bg-background px-3 text-sm">
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button onClick={invite} disabled={action === "invite"} className="rounded-xl">
          {action === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Invite
        </Button>
      </div>

      <div className="divide-y rounded-xl border">
        {members.map((member) => (
          <div key={member.id} className="grid gap-3 p-4 md:grid-cols-[1fr_10rem_8rem_auto] md:items-center">
            <div>
              <p className="font-medium">{member.name || member.email}</p>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            <select
              value={member.role}
              onChange={(e) => changeRole(member.id, e.target.value)}
              disabled={action === member.id}
              className="h-9 rounded-xl border bg-background px-3 text-sm capitalize"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <Badge variant={member.status === "active" ? "default" : "secondary"} className="w-fit rounded-full capitalize">
              {member.status}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)} disabled={action === member.id} className="rounded-xl text-muted-foreground hover:text-destructive">
              {action === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
