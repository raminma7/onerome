import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-2xl border border-line bg-white/70 px-4 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-bordeaux/60 focus:bg-white focus:outline-none focus:ring-4 focus:ring-bordeaux/10 disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, "h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23776c62' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink-soft", className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="mt-1.5 text-sm text-danger">{children}</p>;
}

export function Field({ label, htmlFor, error, hint, children, className }: {
  label?: React.ReactNode; htmlFor?: string; error?: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
