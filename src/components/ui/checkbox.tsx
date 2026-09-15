'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

type CheckboxProps = {
  name?: string;
  value?: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Checkbox({ name, value = 'on', label, description, defaultChecked, disabled, className = '' }: CheckboxProps) {
  return <label className={`ds-checkbox ${className}`.trim()}>
    <CheckboxPrimitive.Root className="ds-checkbox__control" name={name} value={value} defaultChecked={defaultChecked} disabled={disabled}>
      <CheckboxPrimitive.Indicator className="ds-checkbox__indicator"><Check size={14} strokeWidth={3}/></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
    <span className="ds-checkbox__copy"><strong>{label}</strong>{description && <small>{description}</small>}</span>
  </label>;
}
