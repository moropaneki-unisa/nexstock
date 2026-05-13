import { TemplateEditorContentV7 } from "@/components/templates/template-editor-content-v7"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContentV7 kind={kind === "email" ? "email" : "pdf"} />
}
