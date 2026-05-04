import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function IntegrationsPage() {
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold">Integrations</h1><p className="text-sm text-muted-foreground">Zoho sync comes after the core API is stable.</p></div><Card><CardHeader><CardTitle>Zoho Inventory</CardTitle></CardHeader><CardContent><Badge variant="secondary">Planned next</Badge><p className="mt-3 text-sm text-muted-foreground">OAuth, external references, and sync logs are intentionally staged for the next sprint.</p></CardContent></Card></main>;
}
