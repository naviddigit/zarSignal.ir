'use client';

import { useState } from 'react';

type FaqItem = { question: string; answer: string };

export function FaqAccordion({ items, initialOpen = 0 }: { items: readonly FaqItem[]; initialOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(initialOpen);
  return <div className="faq-accordion">
    {items.map((item, index) => {
      const expanded = open === index;
      return <article className={expanded ? 'is-open' : ''} key={item.question}>
        <h2><button type="button" aria-expanded={expanded} aria-controls={`faq-answer-${index}`} onClick={() => setOpen(expanded ? null : index)}><span>{item.question}</span><i aria-hidden="true">{expanded ? '−' : '+'}</i></button></h2>
        <div className="faq-answer" id={`faq-answer-${index}`} aria-hidden={!expanded}><div><p>{item.answer}</p></div></div>
      </article>;
    })}
  </div>;
}
