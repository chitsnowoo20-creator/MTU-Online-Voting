import type { ComponentProps } from "react";

/**
 * Carbon buttons. Square corners, 12px/16px padding, 14px label.
 *
 * `primary` is the blue CTA, `secondary` the charcoal one, `tertiary` a blue
 * outline, `ghost` text-only, `danger` the destructive variant. There is no
 * rounded variant on purpose — see globals.css.
 */
type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "bg-ink text-inverse-ink hover:bg-inverse-surface-1 active:bg-inverse-surface-1",
  tertiary:
    "bg-canvas text-primary border border-primary hover:bg-primary hover:text-on-primary",
  ghost: "bg-transparent text-primary hover:bg-surface-1",
  danger: "bg-error text-on-primary hover:bg-error-ink",
};

const BASE =
  "inline-flex items-center justify-center gap-2 px-4 py-3 text-body-sm " +
  "min-h-12 transition-colors cursor-pointer " +
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-subtle " +
  "disabled:border-transparent disabled:hover:bg-surface-2";

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
