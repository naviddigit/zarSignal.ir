# نقشه راه محصول زر‌سیگنال

وضعیت: پیش‌نویس اسکلت — تا تأیید نوید/مجتبی نهایی نیست.

## ترتیب فعلی (بدون ساخت فرمول جدید)

1. زیرساخت: دیتابیس تولید، feed معتبر، `MARKET_MODE=live` فقط بعد از داده سالم
2. قفل Spec ماشین‌حساب: `CALCULATOR_MASTER_SPEC` سپس M01 تا M11
3. پیاده‌سازی ماژول به ماژول از Spec تأییدشده
4. حسابداری آبشده (جدا از M01)
5. ایجنت نوسان و مدیریت سرمایه فقط بعد از Spec

## اسناد مرتبط همین پوشه

- `ZARSIGNAL_PRODUCT_SPEC.md` — مشخصات کلی محصول
- `PRODUCT_GOVERNANCE.md` — قوانین تصمیم محصول
- `ROADMAP_100K.md` — رشد تا مقیاس بالا
- `GROWTH_AND_RELEASE_PLAN.md` — رشد و انتشار

## ماشین‌حساب (شماره‌گذاری قفل‌شده)

- M01 Weight Conversion
- M02 Purity / Karat Conversion
- M03 Gold & Melted Gold
- M04 Jewelry Gold
- M05 Coins
- M06 Silver
- M07 FX & Price Conversion
- M08 Profit / Loss
- M09 Investment Comparison
- M10 Advanced Tools
- M11 Data / Input Engine

حسابداری آبشده ≠ M01
