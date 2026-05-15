"use client"

import { AlertTriangleIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type RecordActionDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  busy?: boolean
  variant?: "default" | "destructive"
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function RecordActionDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  variant = "destructive",
  onOpenChange,
  onConfirm,
}: RecordActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={variant === "destructive" ? "text-destructive" : undefined}>
            <AlertTriangleIcon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={variant} disabled={busy} onClick={onConfirm}>
            {busy ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
