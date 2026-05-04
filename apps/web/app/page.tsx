import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-muted/40">
      <section className="mx-auto flex max-w-6xl flex-col px-6 py-20">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex rounded-full border bg-white px-3 py-1 text-sm text-muted-foreground">Zoho-first inventory SaaS foundation</div>
          <h1 className="text-5xl font-semibold tracking-tight">A clean product layer for inventory teams and developers.</h1>
          <p className="text-lg text-muted-foreground">InventoryHub gives you product management, inventory logs, API keys, webhooks, and a foundation for Zoho sync.</p>
          <div className="flex gap-3">
            <Button asChild><Link href="/signup">Start building <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="outline"><Link href="/login">Login</Link></Button>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {["Multi-tenant by design", "Developer API included", "Webhook-ready core"].map((item) => (
            <Card key={item}><CardContent className="flex items-center gap-3 p-5"><CheckCircle2 className="h-5 w-5" />{item}</CardContent></Card>
          ))}
        </div>
      </section>
    </main>
  );
}
