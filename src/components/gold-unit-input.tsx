'use client';
import { useState, type InputHTMLAttributes } from 'react';
import { goldCanonical, goldDisplay, goldInputText, type GoldDisplayUnit } from '@/lib/gold-display-unit';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';

export function GoldUnitInput({ value, unit, display, onValueChange, allowNegative = false, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string; unit: string; display: GoldDisplayUnit; onValueChange: (value: string) => void; allowNegative?: boolean;
}) {
  const [draft, setDraft] = useState<{ text: string; canonical: string; display: GoldDisplayUnit } | null>(null);
  const text = draft?.canonical === value && draft.display === display ? draft.text : goldInputText(value, unit, display);
  return <input {...props} value={formatNumericInput(text)} onChange={event => {
    const raw = (allowNegative && /^[−-]/.test(event.target.value.trim()) ? '-' : '') + sanitizeNumericInput(event.target.value, 6);
    const canonical = raw && goldDisplay(1, unit, display).value !== 1 ? String(goldCanonical(Number(raw), unit, display)) : raw;
    setDraft({ text: raw, canonical, display });
    onValueChange(canonical);
  }} />;
}
