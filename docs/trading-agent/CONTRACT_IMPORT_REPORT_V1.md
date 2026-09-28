# Contract Package V1 — گزارش ورود به Source of Truth

## 1. قواعد نگاشت‌شده از متن دریافت‌شده
- تقدم amendment فعال > V5.4 > Registry/Golden Tests > presentation > UI.
- نتیجه فقط DOLLAR_TO_GOLD / GOLD_TO_DOLLAR / HOLD؛ خطای داده نتیجه null دارد، نه HOLD.
- Confidence مستقل از Data Quality و هشدار زمانی؛ مقدار/مقیاس/نسخه از موتور.
- تفکیک Gold-Implied USD Gap از Dollar Bubble و CoinUSDGapPct از CoinBubblePct.
- مخفی‌بودن expressions/weights برای همه سطوح؛ دلیل معتبر قابل نمایش است.
- بازه هشدار تهران 21:00 تا 10:00، fallback مصوب، تنظیم ادمین با audit.
- acknowledgement مخصوص کاربر/درخواست، جدا از snapshot مشترک و تغییرناپذیر.
- marker فقط از گزارش تاریخی واقعی؛ اعلان ANALYSIS_STATE_CHANGE آزمایشی و ارسال production غیرفعال.

## 2–5. Confidence و Registryهای موتور
Confidence executable: پیدا نشد. Reason Codes واقعی: صفر. Risk Flags واقعی: صفر. Trend/Momentum/Gap Trend/Overall Trend enum: ارائه نشده.
فایل‌های مربوط شامل بخش‌های اصلی بسته و برچسب SOURCE_REQUIRED هستند؛ هیچ کدی ساخته نشده است.

## 6. تغییرات Formula Registry
دو رابطه طلای ارائه‌شده از نظر عبارت با محاسبات فعلی همخوان‌اند؛ این تطابق به معنی تأیید کل Engine نیست.
چهار نام فرمول نقره با نسخه دقیق V5.4-SILVER.1 و وضعیت فعال‌نشده ثبت شد.
تعارض: SilverTheo999 در بسته جدید ×0.999 دارد؛ کد src/server/bubble-formulas.ts و GT-SILVERهای فعلی ندارند.
تعریف درصد USD_GAP فعلی actual-minus-implied با مخرج implied است؛ بسته تعریف جایگزین Gold Gap درصدی نداده است. علامت/مخرج تغییر نکرد.

## 7. Golden Tests
هیچ fixture یا expected_output یا tolerance تأییدشده V5.4 در بسته وجود ندارد. صفر تست V5.4 وارد شد.
manifest با cases خالی و SOURCE_REQUIRED ساخته شد. تست‌های V1 موجود جدا هستند؛ به V5.4 تغییر نام داده نشدند.

## 8. SOURCE_REQUIRED
- متن کامل ZARSIGNAL_MASTER_PROMPT_V5_4؛ ادعای حفظ 58/58 بخش، نقل بسته است و مستقلاً قابل بررسی نبود.
- متن کامل ZSA-FX-001، COIN-2026-01/ZSA-COIN-001 و SILVER-2026-01/ZSA-SILVER-001؛ فقط بخش‌های ارسالی موجودند.
- قواعد تصمیم، تقدم تعارض‌ها، confidence executable، مقیاس/گردکردن، registryهای واقعی.
- status موفق، نوع دقیق فیلدها، nullability، timeframeها، قرارداد فراخوانی و validation/synchronization موتور.
- نسخه/شناسه دقیق فرمول‌های بدون نسخه، Golden fixtures و تلورانس مصوب.
- mapping قابلیت‌های HOME/PRO به Planهای فعلی و دامنه فیلدهای دوره آزمایشی.
- scope/اعتبار acknowledgement برای همان request/report و policy version، رفتار درخواست تکراری/تغییر policy بین پذیرش و اجرا.

## 9. DB migrations پیشنهادی، اجرا نشده
- AnalysisTimePolicy نسخه‌دار با timezone ثابت، start/end و actor معتبر.
- AuditLog الحاقی شامل actor، timestamp، previous_value/new_value؛ ذخیره همراه policy در transaction.
- AnalysisSnapshot تغییرناپذیر با شناسه گزارش/ورودی/نسخه‌ها؛ فیلدهای موتور پس از تکمیل قرارداد.
- AnalysisAcknowledgement با user_id/report_id/request_id/warning_policy_version/acknowledged_at، جدا از snapshot.
- supersession با حفظ نسخه قدیمی؛ schema دقیق lifecycle و قیود یکتایی پیش از migration تعیین شود.
از IntegrationSetting عمومی به‌عنوان snapshot موتور یا ثبت پذیرش همه کاربران استفاده نشود.

## 10. API پیشنهادی، نه پیاده‌شده
- درخواست تحلیل احراز هویت‌شده: asset، comparison/timeframe معتبر و request identity؛ محاسبات صرفاً backend.
- در بازه هشدار، قبل از افشای نتیجه فقط policy و نیاز به پذیرش بازگردد؛ پذیرش به کاربر/درخواست/policy متصل شود.
- دریافت گزارش immutable با projection سروری FREE/HOME/PRO؛ فیلد حرفه‌ای برای کاربر عادی ارسال نشود.
- دریافت markers از snapshotهای مجاز و فیلتر زمان؛ نه محاسبه مجدد از داده امروز.
- عملیات ادمین policy با authorization و audit transaction.
نام endpoint و enum موفق نهایی هنوز قرارداد قطعی نیست. API فعلی /api/v1/analysis همچنان 503 است.

## 11. محدوده این تغییر
فقط اسناد وارد/تفکیک شدند و دو placeholder قدیمی به reference تبدیل شدند. فایل Master Prompt جعلی ساخته نشد.
هیچ فرمول، وزن، threshold، expected test value، migration، API یا اعلان production ساخته/فعال نشد. هیچ push/deploy انجام نشد.

## ادامه مستقل مجاز
قاعده زمانی و UI تنظیم ادمین از نظر محصول مشخص‌اند و مستقل از منطق Confidence قابل ساخت هستند. موتور، گزارش نتیجه‌دار و marker تا دریافت منابع دقیق متوقف می‌مانند. واردسازی قرارداد به معنی تکمیل Phase B نیست.
