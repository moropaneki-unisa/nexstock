import { TemplateEditorContentV4 } from "@/components/templates/template-editor-content-v4"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContentV4 templateId={id} />
}
