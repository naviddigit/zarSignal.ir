import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

type FieldProps = {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

/** Shared label+control wrapper so admin/public forms share one vertical rhythm. */
export function Field({ label, htmlFor, className = '', children }: FieldProps) {
  return (
    <label className={`ds-field ${className}`.trim()} htmlFor={htmlFor}>
      <span className="ds-field__label">{label}</span>
      {children}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; fieldClassName?: string };

export function Input({ label, fieldClassName = '', className = '', id, ...props }: InputProps) {
  if (!label) return <input id={id} className={`ds-input ${className}`.trim()} {...props} />;
  return (
    <Field label={label} htmlFor={id} className={fieldClassName}>
      <input id={id} className={`ds-input ${className}`.trim()} {...props} />
    </Field>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; fieldClassName?: string };

export function Textarea({ label, fieldClassName = '', className = '', id, ...props }: TextareaProps) {
  if (!label) return <textarea id={id} className={`ds-input ds-textarea ${className}`.trim()} {...props} />;
  return (
    <Field label={label} htmlFor={id} className={fieldClassName}>
      <textarea id={id} className={`ds-input ds-textarea ${className}`.trim()} {...props} />
    </Field>
  );
}
