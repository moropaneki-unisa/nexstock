import { TemplateEditorContentV2 } from "@/components/templates/template-editor-content-v2"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContentV2 templateId={id} />
}
