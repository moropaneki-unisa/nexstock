import { TemplateEditorContentV2 } from "@/components/templates/template-editor-content-v2"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContentV2 kind={kind === "email" ? "email" : "pdf"} />
}
