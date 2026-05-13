import { TemplateEditorContentV3 } from "@/components/templates/template-editor-content-v3"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContentV3 templateId={id} />
}
