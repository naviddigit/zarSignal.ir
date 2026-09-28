'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/server/admin-auth';
import { db } from '@/lib/db';
import { homeContentKey } from '@/server/home-content';
import { homeSections, homeTexts, parseHomeContent } from '@/lib/home-content';
export async function saveHomeContent(form: FormData) {
  const actor = await requireAdmin();
  const value = parseHomeContent({texts:Object.fromEntries(Object.keys(homeTexts).map(key=>[key,form.get(key)])),sections:Object.fromEntries(Object.keys(homeSections).map(key=>[key,form.get(`show-${key}`)==='on']))});
  if (!value) redirect('/admin/content?error=invalid');
  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382095)`;
      const previous = await tx.integrationSetting.findUnique({where:{key:homeContentKey}});
      await tx.integrationSetting.upsert({where:{key:homeContentKey},create:{key:homeContentKey,category:'content',label:'محتوای صفحه اصلی',enabled:true,publicValue:JSON.stringify(value)},update:{publicValue:JSON.stringify(value)}});
      await tx.integrationSetting.create({data:{key:`content-audit-${randomUUID()}`,category:'audit',label:'Homepage content changed',enabled:true,publicValue:JSON.stringify({actor,at:new Date().toISOString(),previous:previous?.publicValue??null,next:value})}});
    });
  } catch { redirect('/admin/content?error=storage'); }
  revalidatePath('/'); revalidatePath('/admin/content');
  redirect('/admin/content?saved=1');
}
