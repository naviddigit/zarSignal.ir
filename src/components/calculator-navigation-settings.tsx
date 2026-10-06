'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Star } from 'lucide-react';
import { CALCULATOR_MODULE_LABELS } from '@/lib/calculator-access';
import { calculatorProductLabels, visibleCalculatorTools, type CalculatorNavigation, type CalculatorProduct } from '@/lib/calculator-navigation';

const label = (id: string) => id === 'mazaneh' ? 'مظنه ↔ گرم ۱۸ عیار' : CALCULATOR_MODULE_LABELS[id as keyof typeof CALCULATOR_MODULE_LABELS] ?? id;
const move = <T,>(items: T[], from: number, to: number) => {
  const copy = [...items];
  if (to < 0 || to >= copy.length) return copy;
  copy.splice(to, 0, ...copy.splice(from, 1));
  return copy;
};

export function CalculatorNavigationSettings({ initial, writable }: { initial: CalculatorNavigation; writable: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  function moveCategory(index: number, next: number) {
    setDraft(current => ({ ...current, categories: move(current.categories, index, next) }));
  }
  function moveTool(product: CalculatorProduct, index: number, next: number) {
    setDraft(current => ({ ...current, tools: { ...current.tools, [product]: move(visibleCalculatorTools(product, current), index, next) } }));
  }
  function toggleStar(product: CalculatorProduct, id: string) {
    setDraft(current => {
      const starred = current.starred[product];
      return { ...current, starred: { ...current.starred, [product]: starred.includes(id) ? starred.filter(value => value !== id) : [...starred, id] } };
    });
  }

  return <form className="calc-layout-admin" onSubmit={async event => {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/analysis-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calculatorNavigation: draft }),
      });
      if (!response.ok) throw new Error('ذخیره نشد؛ اتصال پایگاه داده را بررسی کنید.');
      setMessage('چیدمان ماشین‌حساب ذخیره شد.');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'ذخیره نشد.'); }
    finally { setPending(false); }
  }}>
    <p>با پیکان‌ها ترتیب پیش‌فرض دسته‌ها و ابزارها را برای همه تنظیم کنید. دلخواه/ستارهٔ هر کاربر در خود ماشین‌حساب (مرورگر) ذخیره می‌شود و اینجا فقط ترتیب پایه را مشخص می‌کند.</p>
    {draft.categories.map((product, categoryIndex) => {
      const items = visibleCalculatorTools(product, draft);
      return <section className="calc-layout-admin__category" key={product}>
        <header><h2>{calculatorProductLabels[product]}</h2><div className="calc-layout-admin__buttons">
          <button type="button" aria-label={`انتقال ${calculatorProductLabels[product]} به بالا`} disabled={categoryIndex === 0} onClick={() => moveCategory(categoryIndex, categoryIndex - 1)}><ArrowUp size={17}/></button>
          <button type="button" aria-label={`انتقال ${calculatorProductLabels[product]} به پایین`} disabled={categoryIndex === draft.categories.length - 1} onClick={() => moveCategory(categoryIndex, categoryIndex + 1)}><ArrowDown size={17}/></button>
        </div></header>
        <div className="calc-layout-admin__list">{items.map((id, index) => {
          const starred = draft.starred[product].includes(id);
          return <div className="calc-layout-admin__item" key={id}>
            <span>{label(id)}</span>
            <div className="calc-layout-admin__buttons">
              <button type="button" className={starred ? 'is-starred' : ''} aria-label={`${starred ? 'برداشتن ستاره' : 'ستاره‌دار کردن'} ${label(id)}`} aria-pressed={starred} title="پین در ابتدای ابزارها" onClick={() => toggleStar(product, id)}><Star size={17} fill={starred ? 'currentColor' : 'none'}/></button>
              <button type="button" aria-label={`انتقال ${label(id)} به بالا`} disabled={index === 0 || draft.starred[product].includes(items[index - 1]) !== starred} onClick={() => moveTool(product, index, index - 1)}><ArrowUp size={17}/></button>
              <button type="button" aria-label={`انتقال ${label(id)} به پایین`} disabled={index === items.length - 1 || draft.starred[product].includes(items[index + 1]) !== starred} onClick={() => moveTool(product, index, index + 1)}><ArrowDown size={17}/></button>
            </div>
          </div>;
        })}</div>
      </section>;
    })}
    <button type="submit" className="button" disabled={!writable || pending}>{pending ? 'در حال ذخیره…' : 'ذخیره چیدمان'}</button>
    {!writable && <p role="alert" className="form-error">اتصال پایگاه داده برقرار نیست؛ ذخیره ممکن نیست.</p>}
    {message && <p role="status">{message}</p>}
  </form>;
}
