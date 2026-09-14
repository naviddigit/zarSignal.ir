'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '@/server/admin-auth';
import { planInput, pricingInput } from '@/server/plan-input';
const yes=(f:FormData,k:string)=>f.get(k)==='on';
const lines=(v:FormDataEntryValue|null)=>String(v??'').split('\n').map(x=>x.trim()).filter(Boolean);
const limits=(f:FormData)=>{const daily=Number(f.get('apiDailyLimit'));return Number.isInteger(daily)&&daily>=0?{daily}:undefined};
export async function savePlan(form:FormData){await requireAdmin();const parsed=planInput.safeParse({title:form.get('title'),slug:form.get('slug'),features:lines(form.get('features')),apiLimits:limits(form),active:yes(form,'active'),displayOrder:Number(form.get('displayOrder')),webAvailable:yes(form,'webAvailable'),mobileAvailable:yes(form,'mobileAvailable')});if(!parsed.success)redirect('/admin/plans?error=plan');const id=String(form.get('id')??'');if(id)await db.plan.update({where:{id},data:parsed.data});else await db.plan.create({data:parsed.data});revalidatePath('/admin/plans');revalidatePath('/pricing');}
export async function deletePlan(form:FormData){await requireAdmin();await db.plan.delete({where:{id:String(form.get('id'))}});revalidatePath('/admin/plans');revalidatePath('/pricing');}
export async function savePricing(form:FormData){await requireAdmin();const discount=String(form.get('discount')??'').trim()||undefined;const parsed=pricingInput.safeParse({planId:form.get('planId'),price:String(form.get('price')??''),currency:form.get('currency'),billingPeriod:form.get('billingPeriod'),discount,effectiveAt:form.get('effectiveAt'),active:yes(form,'active')});if(!parsed.success)redirect('/admin/plans?error=pricing');const id=String(form.get('id')??'');if(id)await db.pricingVersion.update({where:{id},data:parsed.data});else await db.pricingVersion.create({data:parsed.data});revalidatePath('/admin/plans');revalidatePath('/pricing');}
export async function deletePricing(form:FormData){await requireAdmin();await db.pricingVersion.delete({where:{id:String(form.get('id'))}});revalidatePath('/admin/plans');revalidatePath('/pricing');}
