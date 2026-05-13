import { TemplateEditorContentV6 } from "@/components/templates/template-editor-content-v6"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContentV6 kind={kind === "email" ? "email" : "pdf"} />
}
