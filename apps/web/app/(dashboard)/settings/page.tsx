import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold">Settings</h1><p className="text-sm text-muted-foreground">Workspace settings placeholder.</p></div><Card><CardHeader><CardTitle>Workspace</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Billing, team permissions, and org profile settings can be added here.</p></CardContent></Card></main>;
}
