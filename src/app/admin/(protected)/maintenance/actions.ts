'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { saveMaintenanceSettings } from '@/server/maintenance';

export async function updateMaintenance(form: FormData) {
  const actor = await requireAdmin();
  const enabled = form.get('enabled') === 'on';
  const message = String(form.get('message') ?? '');
  try {
    await saveMaintenanceSettings(actor, enabled, message);
  } catch {
    redirect('/admin/maintenance?error=1');
  }
  revalidatePath('/admin/maintenance');
  redirect('/admin/maintenance?saved=1');
}
