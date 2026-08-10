import type { ComponentProps } from "react";

/**
 * Same props, same call sites everywhere in the app — only the visual system
 * changed. Primary is now the brand gradient with a lift-on-hover shadow so
 * every CTA reads unmistakably as "tap me."
 */
type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-on-primary shadow-[0_8px_20px_-8px_rgb(87_173_222/0.5)] " +
    "bg-[image:var(--gradient-brand)] hover:brightness-105 hover:shadow-[0_12px_28px_-8px_rgb(87_173_222/0.58)] " +
    "active:brightness-95",
  secondary:
    "bg-ink text-inverse-ink shadow-soft hover:bg-inverse-surface-1 active:bg-inverse-surface-1",
  tertiary:
    "bg-canvas text-brand-ink border border-primary/25 shadow-soft hover:border-primary hover:bg-primary/5",
  ghost: "bg-transparent text-brand-ink hover:bg-primary/8",
  danger:
    "bg-error text-on-primary shadow-[0_8px_20px_-8px_rgb(239_68_68/0.5)] hover:bg-error-ink",
};

const BASE =
  "inline-flex items-center justify-center gap-2 px-5 py-3 text-body-sm font-semibold " +
  "min-h-12 rounded-xl transition-all duration-200 cursor-pointer press " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return (
    <a
      className={`${BASE} ${VARIANTS[variant]} no-underline hover:no-underline ${className}`}
      {...props}
    />
  );
}
