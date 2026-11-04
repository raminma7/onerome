"use client";
import { Switch as S } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn("relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full bg-travertine transition-colors data-[state=checked]:bg-bordeaux disabled:opacity-50", className)}
      {...props}
    >
      <S.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </S.Root>
  );
}
