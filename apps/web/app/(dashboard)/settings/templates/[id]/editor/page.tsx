import { TemplateEditorContentV7 } from "@/components/templates/template-editor-content-v7"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContentV7 templateId={id} />
}
