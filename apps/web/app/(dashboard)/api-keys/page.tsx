"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [name, setName] = useState("Default API key");
  const [secret, setSecret] = useState<string | null>(null);
  useEffect(() => { apiFetch<any[]>("/api/api-keys").then(setKeys).catch(() => setKeys([])); }, []);
  async function createKey() { const created = await apiFetch<any>("/api/api-keys", { method: "POST", body: JSON.stringify({ name }) }); setSecret(created.secret); setKeys((prev) => [created, ...prev]); }
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold">API Keys</h1><p className="text-sm text-muted-foreground">Create keys for the public developer API.</p></div><Card><CardHeader><CardTitle>Create API key</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={createKey}>Create key</Button>{secret && <div className="rounded-md border bg-muted p-3 font-mono text-xs break-all">{secret}</div>}</CardContent></Card><Card><CardHeader><CardTitle>Existing keys</CardTitle></CardHeader><CardContent className="space-y-2">{keys.map((key) => <div key={key.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{key.name}</p><p className="text-muted-foreground">{key.keyPrefix}</p></div>)}</CardContent></Card></main>;
}
