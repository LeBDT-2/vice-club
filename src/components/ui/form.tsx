import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { ActionState } from "@/lib/validation/common";

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-danger">
      <span aria-hidden="true">⚠</span>
      <span>{errors.join(" ")}</span>
    </p>
  );
}

type FieldProps = {
  label: string;
  name: string;
  errors?: string[];
  hint?: ReactNode;
  className?: string;
} & ComponentProps<"input">;

export function TextField({ label, name, errors, hint, className, id, ...props }: FieldProps) {
  const fieldId = id ?? `f-${name}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = errors?.length ? `${fieldId}-err` : undefined;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className="field"
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${fieldId}-err`} errors={errors} />
    </div>
  );
}

export function TextArea({
  label,
  name,
  errors,
  hint,
  className,
  id,
  ...props
}: { label: string; name: string; errors?: string[]; hint?: ReactNode; className?: string } & ComponentProps<"textarea">) {
  const fieldId = id ?? `f-${name}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errId = errors?.length ? `${fieldId}-err` : undefined;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={fieldId}
        name={name}
        className="field min-h-28 resize-y"
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${fieldId}-err`} errors={errors} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  errors,
  className,
  id,
  children,
  ...props
}: { label: string; name: string; errors?: string[]; className?: string } & ComponentProps<"select">) {
  const fieldId = id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={fieldId}
        name={name}
        className="field"
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${fieldId}-err` : undefined}
        {...props}
      >
        {children}
      </select>
      <FieldError id={`${fieldId}-err`} errors={errors} />
    </div>
  );
}

export function CheckboxGroup({
  legend,
  name,
  options,
  defaultValues = [],
  errors,
  hint,
}: {
  legend: string;
  name: string;
  options: Record<string, string>;
  defaultValues?: string[];
  errors?: string[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-sm text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <label
            key={value}
            className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-deep px-3.5 text-sm has-[:checked]:border-cyan has-[:checked]:bg-cyan/10 has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cyan"
          >
            <input type="checkbox" name={name} value={value} defaultChecked={defaultValues.includes(value)} className="size-4 accent-[#2de2d0]" />
            {label}
          </label>
        ))}
      </div>
      <FieldError id={`f-${name}-err`} errors={errors} />
    </fieldset>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        state.ok ? "border-success/50 bg-success/10 text-ink" : "border-danger/50 bg-danger/10 text-ink",
      )}
    >
      <span className="mr-1.5 font-semibold">{state.ok ? "C'est fait." : "Attention."}</span>
      {state.message}
    </div>
  );
}
