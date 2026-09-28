export function keypadMath(left: number, right: number, operator: string): number {
  if (!Number.isFinite(left) || !Number.isFinite(right)) throw new Error('عدد معتبر وارد کنید.');
  if (operator === '÷' && right === 0) throw new Error('تقسیم بر صفر ممکن نیست.');
  const value = operator === '+' ? left + right : operator === '−' ? left - right : operator === '×' ? left * right : operator === '÷' ? left / right : NaN;
  if (!Number.isFinite(value)) throw new Error('نتیجه خارج از محدوده است.');
  if (value < 0) throw new Error('این ورودی به مقدار غیرمنفی نیاز دارد.');
  return Number(value.toPrecision(14));
}
