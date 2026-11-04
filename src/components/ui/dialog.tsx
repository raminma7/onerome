"use client";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Bottom sheet on mobile, centered modal on larger screens. */
export function DialogContent({ className, children, title, description, hideTitle }: {
  className?: string; children: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; hideTitle?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-night/50 backdrop-blur-md data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[2.25rem] bg-ivory px-6 pb-8 pt-3 shadow-lift data-[state=open]:animate-fade-up sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2.25rem] sm:pt-6",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-ink/15 sm:hidden" />
        <div className={cn("mb-5 flex items-start justify-between gap-4", hideTitle && "sr-only")}>
          <div>
            <D.Title className="font-display text-[2rem] leading-none">{title}</D.Title>
            {description ? <D.Description className="mt-2 text-[15px] leading-relaxed text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="rounded-full bg-ink/5 p-2 text-ink-soft transition hover:bg-ink/10" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
