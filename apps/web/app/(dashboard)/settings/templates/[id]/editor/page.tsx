import { TemplateEditorContentV6 } from "@/components/templates/template-editor-content-v6"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContentV6 templateId={id} />
}
