"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { currencySymbol } from "@/lib/money"
import { cn } from "@/lib/utils"

type MoneyInputFieldProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  label?: string
  required?: boolean
  currency?: string | null
  fieldClassName?: string
  groupClassName?: string
}

const MoneyInput = React.forwardRef<HTMLInputElement, Omit<MoneyInputFieldProps, "label" | "required" | "fieldClassName">>(
  ({ currency, className, groupClassName, ...props }, ref) => {
    return (
      <ButtonGroup className={cn("w-full", groupClassName)}>
        <Button type="button" variant="outline" tabIndex={-1} className="shrink-0 px-3" disabled>
          {currencySymbol(currency)}
        </Button>
        <Input ref={ref} type="number" className={className} {...props} />
      </ButtonGroup>
    )
  },
)
MoneyInput.displayName = "MoneyInput"

const MoneyInputField = React.forwardRef<HTMLInputElement, MoneyInputFieldProps>(
  ({ label, required, fieldClassName, id, ...props }, ref) => {
    return (
      <Field className={fieldClassName}>
        {label ? (
          <FieldLabel htmlFor={id}>
            {label}
            {required ? <span className="ml-1 text-destructive">*</span> : null}
          </FieldLabel>
        ) : null}
        <MoneyInput ref={ref} id={id} {...props} />
      </Field>
    )
  },
)
MoneyInputField.displayName = "MoneyInputField"

export { MoneyInput, MoneyInputField }
