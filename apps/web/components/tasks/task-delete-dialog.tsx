"use client"

import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TaskDeleteDialogProps = {
  open: boolean
  title?: string
  deleting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function TaskDeleteDialog({
  open,
  title,
  deleting,
  onOpenChange,
  onConfirm,
}: TaskDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle>Delete task?</DialogTitle>
          <DialogDescription>
            This will permanently remove {title ? `"${title}"` : "this task"}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={deleting}>Cancel</Button>
          </DialogClose>
          <Button type="button" variant="destructive" disabled={deleting} onClick={onConfirm}>
            <Trash2Icon className="size-4" />
            {deleting ? "Deleting..." : "Delete task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
