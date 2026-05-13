import { TemplateEditorContentV3 } from "@/components/templates/template-editor-content-v3"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContentV3 kind={kind === "email" ? "email" : "pdf"} />
}
