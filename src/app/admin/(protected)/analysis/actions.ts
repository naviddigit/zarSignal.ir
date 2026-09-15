'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { formulaInput } from '@/server/formula-input';
import { createManagedFormula } from '@/server/formulas';
import { instruments } from '@/lib/market';

const lines = (value: FormDataEntryValue | null) => String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean);

export async function saveFormula(form: FormData) {
  await requireAdmin();
  const effectiveAt = String(form.get('effectiveAt') ?? '').trim() || undefined;
  const inputs = form.getAll('inputs').map(String);
  const units = inputs.map(input => {
    const [symbol, side] = input.split('.');
    const instrument = instruments.find(item => item.symbol === symbol);
    return instrument ? `${instrument.currency}/${instrument.unit}:${side}` : '';
  });
  const parsed = formulaInput.safeParse({
    key: form.get('key'), version: form.get('version'), title: form.get('title'), description: form.get('description'), expression: form.get('expression'),
    inputs, units, constants: lines(form.get('constants')), rounding: form.get('rounding'),
    edgeCases: lines(form.get('edgeCases')), fixtures: lines(form.get('fixtures')), status: form.get('status'), effectiveAt,
  });
  if (!parsed.success) redirect('/admin/analysis?error=invalid');
  try { await createManagedFormula(parsed.data); } catch (error) { if (error instanceof Error && error.message === 'duplicate_version') redirect('/admin/analysis?error=duplicate'); throw error; }
  revalidatePath('/admin/analysis');
  revalidatePath('/');
  redirect('/admin/analysis?ok=saved');
}
