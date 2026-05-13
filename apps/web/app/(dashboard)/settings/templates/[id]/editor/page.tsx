import { TemplateEditorContentV8 } from "@/components/templates/template-editor-content-v8"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TemplateEditorContentV8 templateId={id} />
}
