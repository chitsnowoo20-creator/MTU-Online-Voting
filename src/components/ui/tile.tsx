import type { ComponentProps, ReactNode } from "react";

export function Tile({
  elevated = false,
  className = "",
  ...props
}: ComponentProps<"div"> & { elevated?: boolean }) {
  return (
    <div
      className={
        `rounded-2xl border border-hairline shadow-soft ${elevated ? "bg-surface-1 shadow-card" : "bg-canvas"} ` +
        className
      }
      {...props}
    />
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-ink">
      {children}
    </p>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-error/20 bg-error-bg px-4 py-3 text-body-sm text-ink"
    >
      <span className="mt-0.5 text-error">⚠</span>
      <span>{children}</span>
    </div>
  );
}
