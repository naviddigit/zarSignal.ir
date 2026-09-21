import { z } from 'zod';

export const formulaKeys = ['GOLD_BUBBLE', 'SILVER_BUBBLE', 'USD_BUBBLE'] as const;
export const formulaStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED'] as const;
export const formulaMarketInputs = [
  'GOLD_MELTED.buy', 'GOLD_MELTED.sell',
  'GOLD_18K.buy', 'GOLD_18K.sell',
  'XAG_USD.buy', 'XAG_USD.sell',
  'SILVER_999.buy', 'SILVER_999.sell',
  'USD.buy', 'USD.sell',
  'AED.buy', 'AED.sell',
  'XAU_USD.buy', 'XAU_USD.sell',
  'SEKE_CASH.buy', 'SEKE_CASH.sell',
  'ROB_SEKE.buy', 'ROB_SEKE.sell',
] as const;

export const formulaInput = z.object({
  key: z.enum(formulaKeys),
  version: z.coerce.number().int().positive().max(10_000),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(3_000),
  expression: z.string().trim().min(3).max(5_000),
  inputs: z.array(z.enum(formulaMarketInputs)).min(1).max(formulaMarketInputs.length),
  units: z.array(z.string().min(1)).min(1).max(40),
  constants: z.array(z.string().min(1)).max(40),
  rounding: z.string().trim().min(3).max(500),
  edgeCases: z.array(z.string().min(1)).min(1).max(40),
  fixtures: z.array(z.string().min(1)).max(40),
  status: z.enum(formulaStatuses),
  effectiveAt: z.coerce.date().optional(),
}).superRefine((value, context) => {
  if (value.inputs.length !== value.units.length) {
    context.addIssue({ code: 'custom', path: ['units'], message: 'برای هر ورودی باید یک واحد مشخص باشد.' });
  }
  if (value.status === 'APPROVED' && (!value.effectiveAt || value.fixtures.length === 0)) {
    context.addIssue({ code: 'custom', path: ['status'], message: 'فرمول تأییدشده باید تاریخ اجرا و حداقل یک نمونهٔ مرجع داشته باشد.' });
  }
});
