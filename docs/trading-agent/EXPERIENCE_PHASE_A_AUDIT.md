# Trading Agent Experience — Phase A / ادامه کار

مرجع مالک: TRADING_AGENT_EXPERIENCE_REPORT_V1.md (نسخه کامل پیوست نگهداری شد).
محدوده فعلی: اصلاح UX ماشین‌حساب + audit؛ هیچ انتشار یا اجرای هشدار تولیدی انجام نشده.

| بخش | وضعیت | شاهد / نیاز |
| --- | --- | --- |
| قیمت، زمان، حباب طلا و فاصله دلار ضمنی | IMPLEMENTED | server/live-bubbles.ts، references/FORMULA_REGISTRY.md؛ اینها تصمیم معاملاتی نیستند |
| API تصمیم V5.4 | SPEC_BLOCKED | app/api/v1/analysis/route.ts پاسخ 503 formula_not_configured؛ اسناد DECISION_ENGINE و TRADING_AGENT_SPEC اسکلت‌اند |
| Confidence / Reason Codes / Risk Flags | SPEC_BLOCKED | قرارداد خروجی و نگاشت فارسی تأییدشده در repo یافت نشد؛ از حباب استنتاج نشوند |
| AnalysisSnapshot versioned / markers | SPEC_BLOCKED | مدل Prisma ندارد؛ BubbleSnapshot و MarketInputSnapshot جایگزین AnalysisSnapshot نیستند |
| OHLC، سوییچ خطی/کندل، crosshair، tooltip | IMPLEMENTED | components/market-chart.tsx و chart-workspace.tsx؛ SVG فعلی، بدون کتابخانه سنگین |
| pan/zoom و timeframe غیرروزانه | READY_TO_BUILD | نیاز اتصال به OHLC همان timeframe؛ تغییر ظاهر به‌تنهایی کافی نیست |
| تاریخچه با entitlement سروری | IMPLEMENTED | server/history-access.ts؛ رایگان 24h، ویژگی history در پلن |
| دوره آزمایشی + تایمر + تنظیم مدت | IMPLEMENTED | کد محلی موجود؛ حساب واقعی/DB برای آزمون کامل شروع دوره لازم است؛ آزمایشی 30 روز تاریخچه، نه موتور کامل |
| تفکیک Home / Professional تحلیل | SPEC_BLOCKED | history:30d یا 90d مجوز همهٔ فیلدهای حرفه‌ای نیست؛ entitlement مستقل نیاز دارد |
| بازه اعتبار تهران، تنظیم ادمین، audit log | READY_TO_BUILD | قاعده پیوست تأییدشده؛ 21:00 تا 10:00 پیش‌فرض، ولی مدل تنظیم و audit metadata باید ساخته شود |
| acknowledgement قابل ممیزی | READY_TO_BUILD | باید به گزارش معتبر/درخواست مشخص متصل شود؛ click عمومی جایگزین تأیید نیست |
| UI گزارش سه‌لایه | READY_TO_BUILD | ساخت بدون جعل خروجی؛ اتصال کامل وابسته به قرارداد V5.4 |
| اتصال آماده به موتور | READY_TO_CONNECT: هیچ | endpoint تصمیم آماده در مخزن یافت نشد |
| دیده‌بان تحلیل، markers و تغییر تحلیل | SPEC_BLOCKED | داده تاریخی واقعی Engine لازم است |
| اعلان production | SPEC_BLOCKED | provider، consent، throttle، unsubscribe، delivery و rule approval؛ ANALYSIS_STATE_CHANGE غیرفعال بماند |

## تعارض‌ها
- پیوست وجود Confidence واقعی V5.4 را بیان می‌کند؛ کد و اسناد فعلی آن را ندارند. فایل Master Prompt V5.4 و Amendment Registry متناظر یافت نشد.
- نام داخلی USD_BUBBLE در بعضی نمایش‌ها قدیمی است؛ مدل ثبت‌شده USD_GAP است. نباید از آن Dollar Bubble بنیادی ساخت.
- وجود entitlement تاریخچه یا دوره آزمایشی به معنای آماده‌بودن تحلیل کامل یا هدف قیمت نیست.
- موتور زمان‌بندی هشدار 21–10 نباید freshness یا confidence را تغییر دهد.

## ترتیب ادامه (بدون فراموش‌شدن)
1. دریافت قرارداد واقعی Engine V5.4، amendmentها، reason mapping و Golden fixtures؛ بدون حدس.
2. Phase B: تنظیم بازه با admin authorization و audit log، gate سروری و confirmation ثبت‌شده؛ مرزهای 20:59/21:00/23:59/00:00/09:59/10:00/10:01 تست شود.
3. گزارش mobile 360/390/430: نتیجه، دلیل، Confidence و کیفیت مستقل؛ در نبود موتور MODEL_BLOCKED، نه HOLD ساختگی.
4. Phase C: pan/zoom، snapshot marker واقعی، overlay preference و entitlement سروری فیلدها.
5. Phase D: دیده‌بان و UX اعلان؛ ارسال production و analysis-state-change روشن نشود.

## تغییرات این نوبت
واحد قیمت بالای عدد، ورودی با واحد داخل کادر، یادداشت مینیمال تومانی، فضای مستقل پایین برای کیبورد با ارتفاع ثابت. فرمول و داده تغییر نکرد.
DB migration / API جدید در این نوبت: ندارد. انتشار: ندارد.

## نتیجه بررسی UI
- Typecheck پاس؛ چهار تست Playwright دسکتاپ/موبایل پاس.
- WebKit در 360×740، 390×844 و 430×844: فرم حباب بدون اسکرول داخلی، اعداد بازار بدون برش، کیبورد بالاتر از منوی پایین.
- تصاویر: artifacts/calculator-layout/units-360.png، units-390.png، units-430.png.
- این بررسی شبیه‌سازی WebKit است؛ تست دستگاه فیزیکی آیفون انجام نشده.
- مرحله بعد Phase B است؛ خروجی Engine/Confidence/Markers تا ارائه قرارداد و نمونه معتبر V5.4 مسدود می‌ماند. مالک باید منبع V5.4 و amendments را فراهم کند؛ تجربه گزارش پیوست به‌تنهایی منطق موتور نیست.
