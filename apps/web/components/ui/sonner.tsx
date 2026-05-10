"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border bg-background text-foreground shadow-lg",
          title: "font-semibold",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
