import { Suspense } from "react";

import ResetPasswordClient, { ResetPasswordShell } from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
