"use client";
import { useTranslations } from "next-intl";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult, ErrorCode } from "@/lib/errors";

/** Translate an error code coming from a server action / RPC. */
export function useErrorText() {
  const t = useTranslations("errors");
  return useCallback((code: ErrorCode | string) => (t.has(code as ErrorCode) ? t(code as ErrorCode) : t("generic")), [t]);
}

/**
 * Runs a server action inside a transition and toasts translated errors.
 * Returns [run, pending].
 */
export function useAction() {
  const [pending, start] = useTransition();
  const errorText = useErrorText();
  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, opts?: { success?: string; onSuccess?: (data: T) => void; onError?: (code: ErrorCode) => void }) =>
      new Promise<ActionResult<T>>((resolve) => {
        start(async () => {
          try {
            const result = await action();
            if (result.ok) {
              if (opts?.success) toast.success(opts.success);
              opts?.onSuccess?.(result.data);
            } else {
              toast.error(errorText(result.error));
              opts?.onError?.(result.error);
            }
            resolve(result);
          } catch {
            toast.error(errorText("generic"));
            resolve({ ok: false, error: "generic" });
          }
        });
      }),
    [errorText],
  );
  return [run, pending] as const;
}
