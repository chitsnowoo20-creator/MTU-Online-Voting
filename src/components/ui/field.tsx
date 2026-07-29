import type { ComponentProps, ReactNode } from "react";

/**
 * Carbon's input chrome: grey fill, a single bottom rule, square corners. The
 * bottom rule turns blue on focus and red on error — that underline is the
 * whole focus treatment, so don't add a box shadow to it.
 */
export function Field({
  label,
  helper,
  error,
  children,
  htmlFor,
}: {
  label: string;
  helper?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 text-caption text-ink-muted"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-caption text-error-ink">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-caption text-ink-muted">{helper}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid = false,
  className = "",
  ...props
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={
        "w-full bg-surface-1 px-4 py-[11px] text-body text-ink " +
        "border-b outline-none placeholder:text-ink-subtle " +
        "focus:border-b-2 focus:border-primary " +
        (invalid ? "border-b-2 border-error " : "border-ink-subtle ") +
        className
      }
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
