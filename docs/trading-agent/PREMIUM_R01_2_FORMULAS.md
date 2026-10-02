# Premium R01.2 / V5.7 — فرمول‌های صریح گزارش بازار

وضعیت: فرمول‌های صریح زیر **APPROVED برای محاسبهٔ شواهد** هستند.
فایل کامل Master Prompt V5.7 در مخزن نیست؛ قواعد تصمیم / RSI / وزن سکه از نمونهٔ چت حدس زده نمی‌شوند.

کد: `src/server/bubble-formulas.ts`, `src/server/market-indicators.ts`

## ثابت پگ درهم

```
USD_AED_PEG = 3.6725
USD_AED_PEG_VERSION = V5.7-USD_AED.1
USD_AED_PEG_SOURCE = UAE_official_USD_AED_peg
```

این نماد زندهٔ دیده‌بان نیست؛ ثابت نسخه‌دار است.

## حباب طلا ۱۸ (موجود)

```
GOLD_THEORETICAL_18K = (XAUUSD × USD_MARKET / 31.1034768) × 0.75
GOLD_GAP_PCT = (MARKET_18K / GOLD_THEORETICAL_18K − 1) × 100
```

دو مبنای مستقل بازار:

| basis | منبع MARKET_18K |
| --- | --- |
| DERIVED | `GOLD_MELTED ÷ 4.3318` (MAZANEH_TO_18K) |
| DIRECT | قیمت تابلوی `GOLD_18K` |

## دلار ضمنی طلا (نه حباب مستقل دلار)

```
USD_IMPLIED_GOLD = MARKET_18K × 31.1034768 / (XAUUSD × 0.75)
USD_IMPLIED_GAP_PCT = (USD_MARKET / USD_IMPLIED_GOLD − 1) × 100
```

نسخه محصول: `FORMULA_VERSION = 1.0` · نام عمومی: «دلار ضمنی طلا».

## دلار مبتنی بر درهم — V5.7-USD_AED_GAP.1

```
USD_FROM_AED = AED_TOMAN × USD_AED
USD_AED_GAP_PCT = (USD_MARKET / USD_FROM_AED − 1) × 100
```

## مرجع نظری امارات — V5.7-UAE18K.1

```
UAE18K_AED_PER_GRAM = XAUUSD / 31.1034768 × 0.75 × USD_AED
UAE18K_TOMAN_PER_GRAM = UAE18K_AED_PER_GRAM × AED_TOMAN
IRAN_UAE_GAP_PERCENT = (IRAN_GOLD18 / UAE18K_TOMAN_PER_GRAM − 1) × 100
```

این «مرجع نظری امارات» است؛ قیمت خرده‌فروشی واقعی دبی نیست.

## نقره V5.4-SILVER.1

طبق `M_BUBBLE_SILVER.md` / `SILVER_FORMULA_VERSION`.

## لبهٔ تبدیل نظری طلا/نقره — V5.7-GS-RATIO.1

```
WORLD_RATIO = (XAUUSD × 0.75) / (XAGUSD × 0.999)
LOCAL_RATIO = GOLD18 / SILVER999
GS_EDGE_PCT = (LOCAL_RATIO / WORLD_RATIO − 1) × 100
```

بازده قابل اجرای سوآپ نیست. با حباب طلا و نقره هم‌پوشان است؛ دو تأیید مستقل تصمیم حساب نشود.

## ممنوعیت هم‌پوشانی تصمیم

- حباب طلا (اونس×دلار) و دلار ضمنی طلا یک رابطهٔ اقتصادی‌اند.
- حباب طلا (اونس×دلار) و ایران/امارات (اونس×درهم) دو تأیید مستقل تصمیم نیستند.
- دلار ضمنی طلا ≠ دلار مبتنی بر درهم ≠ حباب بنیادی دلار (ZSA-FX-001 کامل در مخزن نیست).

## سکه — SPEC_BLOCKER

`CoinBubblePct` و `CoinUSDGapPct` طبق amendment جدا هستند، اما وزن سکه، عیار، حق ضرب و معیار داخلی در مخزن قطعی نیست → گزارش سکه مسدود می‌ماند.

## روند / RSI — فاقد مشخصات اجرایی

تاریخچهٔ ingestion فعلی `historyResolution=1D` است؛ API عمومی فقط `1D` می‌پذیرد.
روش مصوب روند/RSI در مخزن نیست → `buildMarketViewTrend` = `not_computed`.
نبود روند ≠ HOLD.

## موتور تصمیم — فاقد مشخصات اجرایی

`/api/v1/analysis` همچنان `503 formula_not_configured`.
`engineReadinessForSymbol` = inactive.
«در انتظار تأیید» فقط با شرط اجرایی واقعی مجاز است.

## فهرست کمبودها (فاقد مشخصات اجرایی)

1. فایل کامل Master Prompt V5.7
2. آستانه‌ها، وزن‌ها، confidence، Reason Codes قابل اجرا
3. قواعد RSI / GAP_TREND روی کندل ۱ساعته
4. مشخصات قطعی سکه (وزن، عیار، حق ضرب، حباب داخلی vs جهانی)
5. متن کامل ZSA-FX-001 برای حباب مستقل دلار (غیر از دلار ضمنی طلا و دلار/درهم)
6. SwapEdge اجرایی (bid/ask، هزینه، قابلیت اجرا)

## Golden fixture (فقط تست — hard-code در گزارش زنده ممنوع)

| ورودی | مقدار |
| --- | --- |
| USD | 261698 تومان/دلار |
| AED | 71310 تومان/درهم |
| USD_AED | 3.6725 |
| XAU | 4192.37 |
| XAG | 61.48 |
| GOLD18 | 26039971 تومان/گرم |
| SILVER999 | 516051 تومان/گرم |

انتظار (گرد ۲ رقم):

| شاخص | ٪ |
| --- | --- |
| Gold gap | −1.57 |
| Iran/UAE gap | −1.64 |
| USD/AED gap | −0.07 |
| Silver gap | −0.14 |
| Gold/Silver theoretical conversion edge | −1.43 |
