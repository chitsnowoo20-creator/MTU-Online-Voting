import type { ComponentProps, ReactNode } from "react";

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
      <label htmlFor={htmlFor} className="mb-2 text-caption font-semibold text-ink-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-caption text-error-ink">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-caption text-ink-subtle">{helper}</p>
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
        "w-full rounded-xl bg-canvas px-4 py-3 text-body text-ink shadow-[inset_0_1px_2px_rgb(20_32_51/0.03)] " +
        "border outline-none placeholder:text-ink-subtle transition-all " +
        "focus:border-primary focus:ring-4 focus:ring-primary/10 " +
        (invalid ? "border-error " : "border-hairline ") +
        className
      }
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
