'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/server/admin-auth';
import { planInput, pricingInput } from '@/server/plan-input';
import { removeManagedPlan, removeManagedPricing, upsertManagedPlan, upsertManagedPricing } from '@/server/plans';
const yes=(f:FormData,k:string)=>f.get(k)==='on';
const lines=(v:FormDataEntryValue|null)=>String(v??'').split('\n').map(x=>x.trim()).filter(Boolean);
const limits=(f:FormData)=>{const daily=Number(f.get('apiDailyLimit'));return Number.isInteger(daily)&&daily>=0?{daily}:undefined};
export async function savePlan(form:FormData){await requireAdmin();const parsed=planInput.safeParse({title:form.get('title'),slug:form.get('slug'),features:lines(form.get('features')),apiLimits:limits(form),active:yes(form,'active'),displayOrder:Number(form.get('displayOrder')),webAvailable:yes(form,'webAvailable'),mobileAvailable:yes(form,'mobileAvailable')});if(!parsed.success)redirect('/admin/plans?error=plan');await upsertManagedPlan(String(form.get('id')??''),parsed.data);revalidatePath('/admin/plans');revalidatePath('/pricing');}
export async function deletePlan(form:FormData){await requireAdmin();await removeManagedPlan(String(form.get('id')));revalidatePath('/admin/plans');revalidatePath('/pricing');}
export async function savePricing(form:FormData){await requireAdmin();const discount=String(form.get('discount')??'').trim()||undefined;const parsed=pricingInput.safeParse({planId:form.get('planId'),price:String(form.get('price')??''),currency:form.get('currency'),billingPeriod:form.get('billingPeriod'),discount,effectiveAt:form.get('effectiveAt'),active:yes(form,'active')});if(!parsed.success)redirect('/admin/plans?error=pricing');await upsertManagedPricing(String(form.get('id')??''),{...parsed.data,discount:parsed.data.discount??null});revalidatePath('/admin/plans');revalidatePath('/pricing');}
export async function deletePricing(form:FormData){await requireAdmin();await removeManagedPricing(String(form.get('id')));revalidatePath('/admin/plans');revalidatePath('/pricing');}
