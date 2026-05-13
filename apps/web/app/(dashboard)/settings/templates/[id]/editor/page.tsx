import { TemplateEditorContent } from "@/components/templates/template-editor-content"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContent templateId={id} />
}
