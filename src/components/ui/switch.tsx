"use client";
import { Switch as S } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn("relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full bg-ink/15 transition-colors duration-300 data-[state=checked]:bg-success disabled:opacity-50", className)}
      {...props}
    >
      <S.Thumb className="block size-[27px] translate-x-[2px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15)] transition-transform duration-300 data-[state=checked]:translate-x-[22px]" />
    </S.Root>
  );
}
