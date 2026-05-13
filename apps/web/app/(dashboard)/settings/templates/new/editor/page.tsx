import { TemplateEditorContentV8 } from "@/components/templates/template-editor-content-v8"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContentV8 kind={kind === "email" ? "email" : "pdf"} />
}
