import { IntegrationWorkflow } from "@/components/integrations/integration-workflow";

export default async function IntegrationSourcePage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  return <IntegrationWorkflow source={source} initialSection="configuration" />;
}
