"use client"

import * as React from "react"

import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function AppSelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectTrigger>) {
  return (
    <SelectTrigger
      className={cn("w-full min-w-0 [&>span]:truncate", className)}
      {...props}
    >
      {children ?? <SelectValue />}
    </SelectTrigger>
  )
}

export function AppSelectContent({
  className,
  position = "popper",
  side = "bottom",
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectContent>) {
  return (
    <SelectContent
      position={position}
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[min(32rem,calc(100vw-2rem))]",
        className,
      )}
      {...props}
    />
  )
}

export function AppSelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectItem>) {
  return (
    <SelectItem className={cn("min-w-0", className)} {...props}>
      <span className="block min-w-0 truncate">{children}</span>
    </SelectItem>
  )
}
