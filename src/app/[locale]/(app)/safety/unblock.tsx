"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/use-action";
import { unblockAction } from "@/server/actions/matching";

export function UnblockButton({ target }: { target: string }) {
  const t = useTranslations("safety");
  const router = useRouter();
  const [run, pending] = useAction();
  return <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => unblockAction(target), { onSuccess: () => router.refresh() })}>{t("unblock")}</Button>;
}
