"use client"

import { Loader2Icon, SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type ModuleFormActionsProps = {
  saving?: boolean
  editing?: boolean
  createLabel?: string
  updateLabel?: string
  cancelLabel?: string
  onCancel: () => void
  className?: string
}

export function ModuleFormActions({
  saving = false,
  editing = false,
  createLabel = "Create",
  updateLabel = "Save changes",
  cancelLabel = "Cancel",
  onCancel,
  className,
}: ModuleFormActionsProps) {
  return (
    <div className={className ?? "flex flex-col gap-2 sm:flex-row"}>
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
        {saving ? "Saving..." : editing ? updateLabel : createLabel}
      </Button>
    </div>
  )
}
