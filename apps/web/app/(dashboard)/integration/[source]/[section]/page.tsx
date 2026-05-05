import { IntegrationWorkflow } from "@/components/integrations/integration-workflow";
import type { IntegrationSection } from "@/lib/integrations";

const allowedSections = new Set(["configuration", "mapping", "sync", "history", "logs"]);

export default async function IntegrationSectionPage({ params }: { params: Promise<{ source: string; section: string }> }) {
  const { source, section } = await params;
  const safeSection = allowedSections.has(section) ? (section as IntegrationSection) : "configuration";
  return <IntegrationWorkflow source={source} initialSection={safeSection} />;
}
