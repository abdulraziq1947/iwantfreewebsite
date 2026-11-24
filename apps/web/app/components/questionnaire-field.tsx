import { useId, type HTMLAttributes } from "react";
import { AlertIcon } from "./start-funnel";

type FieldProps = {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  minLength?: number;
  /** Message from the server for this field; marks the control invalid. */
  error?: string | null;
  /** Show an "Optional" tag when the field is not required. */
  markOptional?: boolean;
};

export function QuestionnaireField({
  label,
  name,
  defaultValue,
  required,
  hint,
  placeholder,
  type = "text",
  multiline,
  rows = 3,
  autoComplete,
  inputMode,
  minLength,
  error,
  markOptional = true,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = {
    id,
    name,
    required,
    defaultValue,
    placeholder,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  return (
    <div className={`st-field${error ? " is-invalid" : ""}`}>
      <div className="st-field__head">
        <label className="st-field__label" htmlFor={id}>
          {label}
          {!required && markOptional ? (
            <span className="st-field__optional">Optional</span>
          ) : null}
        </label>
        {hint ? (
          <p className="st-field__hint" id={hintId}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="st-field__error" id={errorId}>
            <AlertIcon />
            {error}
          </p>
        ) : null}
      </div>
      {multiline ? (
        <textarea {...control} rows={rows} />
      ) : (
        <input
          {...control}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          minLength={minLength}
        />
      )}
    </div>
  );
}
