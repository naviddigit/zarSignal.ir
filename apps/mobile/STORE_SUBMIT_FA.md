# ارسال اپ زرسیگنال به Google Play و App Store

## واقعیت الان (صادقانه)

- **کد موبایل** در `apps/mobile` آماده مسیر فروشگاهی است: منوی پایین، قیمت زنده، ماشین‌حساب واقعی (وزن/عیار/مظنه/حباب)، تحلیل مویرگی دمو.
- **فایل امضاشدهٔ نهایی (AAB / IPA) بدون حساب شما ساخته نمی‌شود.** باید Expo + Google Play Console + Apple Developer داشته باشید.
- «۵۰ هزار فروش» هدف محصول است، نه چیزی که با یک بیلد تضمین شود؛ نیاز به پرداخت واقعی، مارکتینگ، و تکمیل هشدار/اشتراک دارد.

## پیش‌نیاز حساب‌ها

1. [Expo](https://expo.dev) — برای EAS Build
2. [Google Play Console](https://play.google.com/console) — یک‌بار هزینه ثبت‌نام
3. [Apple Developer](https://developer.apple.com) — سالانه؛ بدون آن IPA فروشگاهی ممکن نیست
4. API پروداکشن: `https://zarsignal.ir` (در `eas.json` ست شده)

## ساخت فایل‌های فروشگاهی

```powershell
cd apps\mobile
npm install -g eas-cli
eas login
eas init
# projectId را در app.json جای REPLACE بگذار
eas build --platform android --profile production
eas build --platform ios --profile production
```

خروجی:
- اندروید: **AAB** برای Play
- iOS: **IPA** برای App Store Connect (نیاز به مک برای برخی مراحل محلی نیست اگر EAS cloud باشد)

ارسال:

```powershell
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## آیکون و اسکرین‌شات

قبل از submit لازم است:
- `assets/icon.png` و `adaptive-icon.png`
- اسکرین موبایل فارسی برای فروشگاه
- لینک حریم خصوصی (مثلاً صفحه شفافیت سایت)

## روی ویندوز خودت ببین

```powershell
cd c:\Users\SMP\Desktop\ZarSignal.ir\source
npm run dev
cd apps\mobile
# برای دمو محلی:
# EXPO_PUBLIC_API_URL=http://localhost:3000
npm run web
```

مرورگر: http://localhost:8081 — ماشین‌حساب را باز کن و «محاسبه» بزن.

## هنوز برای فروش ۵۰هزار لازم است (فاز بعد)

- ورود واقعی (OTP)
- اشتراک Play Billing / گیفت + گزارش ادمین
- هشدار حباب Push
- آیکون برند نهایی + استور لیستینگ
- حذف placeholderهای REPLACE در `app.json` / `eas.json`
