import { z } from 'zod';

export const formulaKeys = ['GOLD_BUBBLE', 'SILVER_BUBBLE', 'USD_BUBBLE'] as const;
export const formulaStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED'] as const;

export const formulaInput = z.object({
  key: z.enum(formulaKeys),
  version: z.coerce.number().int().positive().max(10_000),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(3_000),
  expression: z.string().trim().min(3).max(5_000),
  inputs: z.array(z.string().min(1)).min(1).max(40),
  units: z.array(z.string().min(1)).min(1).max(40),
  constants: z.array(z.string().min(1)).max(40),
  rounding: z.string().trim().min(3).max(500),
  edgeCases: z.array(z.string().min(1)).min(1).max(40),
  fixtures: z.array(z.string().min(1)).max(40),
  status: z.enum(formulaStatuses),
  effectiveAt: z.coerce.date().optional(),
}).superRefine((value, context) => {
  if (value.status === 'APPROVED' && (!value.effectiveAt || value.fixtures.length === 0)) {
    context.addIssue({ code: 'custom', path: ['status'], message: 'فرمول تأییدشده باید تاریخ اجرا و حداقل یک نمونهٔ مرجع داشته باشد.' });
  }
});
