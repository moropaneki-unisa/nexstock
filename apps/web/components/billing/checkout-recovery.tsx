"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckoutRecoveryProps = {
  message?: string | null;
  onRetry: () => void;
  onReset: () => void;
};

export function CheckoutRecovery({ message, onRetry, onReset }: CheckoutRecoveryProps) {
  return (
    <div className="space-y-3">
      {message && (
        <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {message}
        </div>
      )}
      <Button type="button" onClick={onRetry} className="w-full rounded-xl py-6 font-semibold">
        <RefreshCcw className="h-4 w-4" />
        Try payment again
      </Button>
      <Button type="button" variant="outline" onClick={onReset} className="w-full rounded-xl py-6 font-semibold">
        Reset checkout
      </Button>
    </div>
  );
}
