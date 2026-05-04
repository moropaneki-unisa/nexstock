"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [url, setUrl] = useState("https://example.com/webhook");
  useEffect(() => { apiFetch<any[]>("/api/webhooks").then(setHooks).catch(() => setHooks([])); }, []);
  async function createHook() { const created = await apiFetch<any>("/api/webhooks", { method: "POST", body: JSON.stringify({ url, events: ["product_created", "product_updated", "inventory_updated", "webhook_test"] }) }); setHooks((prev) => [created, ...prev]); }
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold">Webhooks</h1><p className="text-sm text-muted-foreground">Send product and inventory events to external apps.</p></div><Card><CardHeader><CardTitle>Create webhook</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={url} onChange={(e) => setUrl(e.target.value)} /><Button onClick={createHook}>Create webhook</Button></CardContent></Card><Card><CardHeader><CardTitle>Existing webhooks</CardTitle></CardHeader><CardContent className="space-y-2">{hooks.map((hook) => <div key={hook.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{hook.url}</p><p className="text-muted-foreground">{hook.events?.join(", ")}</p></div>)}</CardContent></Card></main>;
}
