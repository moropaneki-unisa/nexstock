import { TemplateEditorContent } from "@/components/templates/template-editor-content"

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  return <TemplateEditorContent kind={kind === "email" ? "email" : "pdf"} />
}
