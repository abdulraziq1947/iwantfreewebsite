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
}: FieldProps) {
  return (
    <label className="iwfw-field">
      <span className="iwfw-field__label">
        {label}
        {required ? <span className="iwfw-field__req">*</span> : null}
      </span>
      {hint ? <em className="iwfw-field__hint">{hint}</em> : null}
      {multiline ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      )}
    </label>
  );
}
