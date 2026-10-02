'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/server/admin-auth';
import { markFeedbackReviewed } from '@/server/admin-feedback';
import { persistFeedbackCooldownHours } from '@/server/feedback-policy';

export async function setFeedbackReviewedAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const reviewed = String(formData.get('reviewed') ?? '') === '1';
  await markFeedbackReviewed(actor, id, reviewed);
  revalidatePath('/admin/feedback');
}

export async function saveFeedbackCooldownAction(formData: FormData) {
  const actor = await requireAdmin();
  const hours = Number(formData.get('hours'));
  if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
    throw new Error('ساعت نامعتبر است');
  }
  await persistFeedbackCooldownHours(actor, hours);
  revalidatePath('/admin/feedback');
  revalidatePath('/admin/analysis-settings');
}
