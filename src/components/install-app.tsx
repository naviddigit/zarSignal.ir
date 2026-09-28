'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    update();
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const complete = () => { setInstalled(true); setPrompt(null); dialog.current?.close(); };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', complete);
    standalone.addEventListener('change', update);
    return () => { window.removeEventListener('beforeinstallprompt', available); window.removeEventListener('appinstalled', complete); standalone.removeEventListener('change', update); };
  }, []);
  if (installed) return null;
  return <>
    <button className="install-app-button" aria-label="نصب زرسیگنال" title="نصب زرسیگنال" onClick={async () => {
      if (!prompt) { dialog.current?.showModal(); return; }
      try { await prompt.prompt(); await prompt.userChoice; } catch { dialog.current?.showModal(); }
      finally { setPrompt(null); }
    }}><Download size={18}/><span>نصب</span></button>
    <dialog ref={dialog} className="install-app-dialog" aria-labelledby="install-app-title">
      <form method="dialog"><button aria-label="بستن راهنمای نصب"><X size={20}/></button></form>
      <img src="/icons/app-192.png" width="64" height="64" alt="نشان زرسیگنال"/>
      <h2 id="install-app-title">زرسیگنال، همیشه در دسترس</h2>
      {ios ? <><p>در Safari گزینه اشتراک‌گذاری <Share size={16}/> را بزنید، سپس «افزودن به صفحه اصلی» (Add to Home Screen) و «افزودن» (Add) را انتخاب کنید.</p><p>اگر داخل مرورگر یک پیام‌رسان هستید، ابتدا صفحه را در Safari باز کنید.</p></> : <><p>در منوی مرورگر گزینه «نصب برنامه» (Install app) یا «افزودن به صفحه اصلی» را انتخاب کنید.</p><p>در Chrome و Edge دسکتاپ از آیکن نصب کنار نوار آدرس استفاده کنید. در Safari مک، گزینه File → Add to Dock در دسترس است. نمایش این گزینه به پشتیبانی مرورگر بستگی دارد.</p></>}
      <p className="install-app-note">نسخه وب نصب می‌شود؛ برای دریافت قیمت‌های تازه به اینترنت نیاز دارید.</p>
    </dialog>
  </>;
}
