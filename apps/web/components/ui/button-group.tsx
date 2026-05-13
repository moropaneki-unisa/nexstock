import * as React from "react"

import { cn } from "@/lib/utils"

function ButtonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      className={cn("inline-flex items-center rounded-md border bg-background", className)}
      {...props}
    />
  )
}

function ButtonGroupItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group-item"
      className={cn(
        "border-r last:border-r-0 [&_button]:rounded-none first:[&_button]:rounded-l-md last:[&_button]:rounded-r-md",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup, ButtonGroupItem }
