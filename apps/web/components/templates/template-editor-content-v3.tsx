"use client"

import { TemplateEditorContentV2 } from "@/components/templates/template-editor-content-v2"

type TemplateKind = "pdf" | "email"

export function TemplateEditorContentV3({ templateId, kind = "pdf" }: { templateId?: string; kind?: TemplateKind }) {
  return (
    <div className="nexstock-template-editor-shell">
      <TemplateEditorContentV2 templateId={templateId} kind={kind} />
      <style jsx global>{`
        .nexstock-template-editor-shell > .grid.h-screen {
          grid-template-columns: 18rem minmax(0, 1fr) 20rem !important;
        }

        .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type {
          display: block !important;
        }

        .nexstock-template-editor-shell > .grid.h-screen > aside:first-child,
        .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type,
        .nexstock-template-editor-shell > .grid.h-screen > div {
          min-width: 0;
        }

        @media (max-width: 980px) {
          .nexstock-template-editor-shell > .grid.h-screen {
            grid-template-columns: 17rem minmax(0, 1fr) !important;
          }

          .nexstock-template-editor-shell > .grid.h-screen > aside:last-of-type {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
