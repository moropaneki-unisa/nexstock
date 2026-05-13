import { TemplateEditorContentV4 } from "@/components/templates/template-editor-content-v4"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContentV4 kind={kind === "email" ? "email" : "pdf"} />
}
