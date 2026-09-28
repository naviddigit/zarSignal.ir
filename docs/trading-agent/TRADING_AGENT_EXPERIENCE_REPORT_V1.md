ZARSIGNAL — TRADING AGENT EXPERIENCE & REPORT SPEC V1
OWNER: Mojtaba / Navid
ENGINE: ZarSignal Master Prompt V5.4
STATUS: APPROVED except items explicitly marked EXPERIMENTAL/SPEC_BLOCKER

==================================================
0. YOUR ROLE
==================================================

تو مسئول طراحی و پیاده‌سازی UX/UI و integration layer خروجی
Trading Agent در ZarSignal هستی.

هدف ساخت یک صفحه پر از عدد نیست.

کاربر باید روی موبایل ظرف چند ثانیه بفهمد:

1. وضعیت فعلی چیست؟
2. چرا سیستم به این نتیجه رسیده؟
3. اطمینان موتور چقدر است؟
4. داده چقدر معتبر/تازه است؟
5. چه شواهدی پشت تحلیل وجود دارد؟
6. چه ریسک‌هایی وجود دارد؟
7. چه چیزی نسبت به تحلیل قبلی تغییر کرده؟
8. در پلن حرفه‌ای، وضعیت دلار ضمنی نسبت به دلار واقعی چیست؟

IMPORTANT:
هیچ Formula، Score، Weight، Threshold، Signal، Reason یا
Market Rule جدیدی اختراع نکن.

Source of Truth برای منطق تحلیل:
Master Prompt V5.4 + amendments تأییدشده repo.

Frontend حق تصمیم‌گیری معاملاتی ندارد.
Frontend فقط خروجی معتبر Analysis Engine را نمایش می‌دهد.


==================================================
1. CANONICAL ANALYSIS RESULTS
==================================================

Canonical result states:

DOLLAR_TO_GOLD
GOLD_TO_DOLLAR
HOLD

این سه مورد نتیجه Analysis Engine هستند.

این وضعیت‌ها جدا هستند:

DATA_UNAVAILABLE
DATA_STALE
DATA_CONFLICT
MODEL_BLOCKED

آنها Trading Result نیستند.

PAYWALLED نیز Trading Result نیست؛
Access State است.

هیچ state جدیدی بدون Spec ایجاد نکن.


==================================================
2. CONFIDENCE
==================================================

V5.4 دارای Score/Confidence واقعی است.

از همان خروجی Engine استفاده کن.

DO NOT:
- score جدید بساز
- weight جدید تعریف کن
- Confidence را در Frontend محاسبه کن
- threshold برای Low/Medium/High اختراع کن

اگر V5.4 mapping رسمی Low/Medium/High دارد:
همان mapping استفاده شود.

اگر فقط numeric score دارد:
فقط numeric score نمایش داده شود.

IMPORTANT:

Confidence != Data Quality

UI باید این دو را مستقل نمایش دهد.

Example:

اطمینان تحلیل
82/100

کیفیت داده
معتبر


==================================================
3. ANALYSIS RELIABILITY TIME WINDOW
==================================================

APPROVED DOMAIN RULE.

Timezone:

Asia/Tehran

Default warning window:

START = 21:00 Tehran
END   = 10:00 Tehran

یعنی:

21:00 <= Tehran Time < 24:00
OR
00:00 <= Tehran Time < 10:00

=> LIMITED_TIME_RELIABILITY

10:00 <= Tehran Time < 21:00

=> STANDARD_TIME_RELIABILITY

کاربر در تمام 24 ساعت اجازه درخواست Analysis دارد.

اما در Warning Window تحلیل نباید فوراً نمایش داده شود.


==================================================
4. WARNING FLOW
==================================================

اگر کاربر بین 21:00 و 10:00 تهران Analysis درخواست کرد:

Request Analysis
      ↓
Check Tehran Time
      ↓
Inside Warning Window?
      ↓ YES
Show Reliability Warning
      ↓
Require Explicit Confirmation
      ↓
User confirms?
   ↙        ↘
 NO         YES
Stop       Run/Show Analysis

Persian copy:

«هشدار اعتبار تحلیل

در این بازه زمانی نرخ‌های اصلی بازار ممکن است هنوز از اعتبار
و ثبات کافی برای تحلیل استاندارد برخوردار نباشند.

بازه اصلی و قابل اتکاتر تحلیل زرسیگنال از ساعت ۱۰:۰۰ صبح
تا ۲۱:۰۰ به وقت تهران است.

در صورت تمایل همچنان می‌توانید تحلیل فعلی را مشاهده کنید.»

Buttons:

[مشاهده تحلیل با پذیرش هشدار]
[فعلاً نمایش نده]

پس از تأیید کاربر، Analysis نمایش داده شود اما Badge آن باقی بماند:

«تحلیل خارج از بازه استاندارد»

این هشدار نباید با Data Quality یا Confidence ادغام شود.

DO NOT automatically reduce Confidence Score
unless V5.4 explicitly defines such behavior.


==================================================
5. ADMIN — ANALYSIS TIME WINDOW
==================================================

Warning Window باید از Admin قابل مدیریت باشد.

Admin UI را دقیقاً با Design System فعلی ZarSignal بساز.
یک UI خارجی/متفاوت نساز.

Suggested route:

/admin/analysis-settings

Section:

«بازه اعتبار تحلیل»

Fields:

Timezone:
Asia/Tehran

Standard Analysis Start:
10:00

Standard Analysis End:
21:00

یا معادل آن:

Warning Start:
21:00

Warning End:
10:00

Default:
21:00 → 10:00

Admin باید بتواند Start/End را تغییر دهد.

Validation:
- HH:mm
- overnight range supported
- invalid/equal ranges blocked
- timezone در V1 = Asia/Tehran

Persist settings in DB.

Required metadata:

updated_at
updated_by
previous_value
new_value

تغییر تنظیم باید Audit Log داشته باشد.

Frontend نباید این ساعات را hard-code کند.
Analysis Gate باید config فعال را از backend بخواند.

در صورت unavailable بودن config:
از APPROVED DEFAULT استفاده شود:

21:00 → 10:00
Asia/Tehran

Admin UI باید:
- Dark/Light/System را رعایت کند
- semantic tokens پروژه را استفاده کند
- responsive باشد
- وضعیت فعلی را واضح نشان دهد
- Save pending/success/error feedback داشته باشد


==================================================
6. THREE USER EXPERIENCES
==================================================

--------------------------------
FREE
--------------------------------

هدف:
کاربر ارزش ZarSignal را بفهمد.

نمایش:

- Market Price
- Approved current Bubble/Gap
- توضیح ساده عدد
- Data freshness
- نمونه/preview محدود Analysis

نباید محصول رایگان را کاملاً بی‌ارزش کنیم.

اما Full Analysis پولی است.


--------------------------------
HOME / خانگی
--------------------------------

نمایش:

- Canonical Analysis Result
- توضیح انسانی نتیجه
- Confidence V5.4
- Data Quality
- Timestamp
- Time Reliability
- دلیل‌های اصلی
- Risk Flags تأییدشده
- Trend information تأییدشده برای این Tier
- History مطابق entitlement
- Basic Alerts پس از approval

Formula مخفی است.


--------------------------------
PROFESSIONAL / حرفه‌ای
--------------------------------

همه Home +

- Implied USD
- Actual/Live USD
- Difference between Implied USD and Actual USD
- direction/trend of this difference
- Overall Market Trend
- deeper evidence
- advanced historical comparison
- advanced chart overlays
- advanced alerts بعد از approval

Formula مخفی است.

IMPORTANT:

Gold-Implied USD Gap
!=
Dollar Bubble

این دو مفهوم هرگز merge یا rename نشوند.

همچنین در Coin:

CoinUSDGapPct
!=
CoinBubblePct


==================================================
7. FORMULA PRIVACY VS EXPLANATION
==================================================

فرمول ریاضی برای Home و Professional نمایش داده نشود.

اما دلیل Analysis باید نمایش داده شود.

مثلاً مجاز:

«طلای داخلی پایین‌تر از ارزش محاسباتی مدل قرار دارد،
اما روند هنوز تأیید کافی ایجاد نکرده است.»

یا:

«اختلاف دلار ضمنی و دلار لحظه‌ای در حال افزایش است.»

غیرمجاز:

نمایش expression داخلی، coefficients،
weightها یا proprietary formula.

Reasoning باید از Engine Reason Codes بیاید.

LLM/Frontend حق اختراع Reason ندارد.


==================================================
8. MOBILE-FIRST REPORT
==================================================

این بخش حیاتی است.

گزارش روی 360 / 390 / 430 px باید تست شود.

LEVEL 1 — QUICK VIEW

در اولین viewport:

Asset
Result
One-line explanation
Confidence
Data Quality
Time Reliability
Timestamp

CTA:

[چرا؟]
[مشاهده روی چارت]

کاربر نباید برای فهمیدن نتیجه مجبور به scroll طولانی باشد.


LEVEL 2 — WHY?

Expandable / Bottom Sheet / Section:

- دلایل اصلی
- Valuation status
- Trend
- Momentum اگر Engine ارائه می‌دهد
- Risk Flags
- relevant gaps
- changes since previous analysis

اطلاعات باید فارسی، کوتاه و قابل فهم باشد.


LEVEL 3 — PROFESSIONAL

برای Professional:

- Implied USD
- Actual USD
- Gap
- Gap Trend
- Overall Trend
- deeper evidence
- historical context
- approved metadata

Formula همچنان مخفی.


==================================================
9. HUMAN-READABLE LANGUAGE
==================================================

UI را با اصطلاحات developer پر نکن.

مثلاً به جای:

reason_code = TREND_CONFIRM

نمایش بده:

«روند حرکت، تحلیل فعلی را تأیید می‌کند.»

به جای:

DATA_STALE

نمایش بده:

«برخی داده‌های بازار به‌روز نیستند؛ تحلیل جدید موقتاً متوقف شده است.»

اما Mapping متن باید deterministic باشد.

Reason Code
→ Approved Persian Copy

نه متن آزاد و تصادفی AI.


==================================================
10. ANALYSIS SNAPSHOT
==================================================

هر Analysis باید Snapshot مستقل و versioned داشته باشد.

حداقل:

report_id
asset_id
comparison_pair

analysis_type
timeframe

result
confidence

reason_codes[]
risk_flags[]

market_price
theoretical_price
deviation_percent

trend_state
momentum_state

data_quality

analysis_timestamp_utc
analysis_timestamp_tehran

time_reliability

warning_window_start
warning_window_end

user_warning_acknowledged
warning_acknowledged_at

formula_versions[]
input_snapshot_id

status
superseded_by

در صورت نیاز metrics بازارها extension جدا داشته باشند:

gold_metrics
fx_metrics
coin_metrics
silver_metrics

از یک object شلوغ با ده‌ها فیلد nullable بدون structure خودداری کن.


==================================================
11. CANDLESTICK CHART
==================================================

Premium users باید Chart حرفه‌ای Candlestick داشته باشند.

هدف UX:
تجربه‌ای آشنا و سریع شبیه ابزارهای charting حرفه‌ای مانند
TradingView، بدون کپی مستقیم UI/branding آن.

Chart باید حداقل پشتیبانی کند:

- Candlestick OHLC
- timeframe selection
- pan
- zoom
- crosshair
- responsive mobile interaction
- timestamp
- price tooltip

از library موجود پروژه در صورت مناسب بودن استفاده کن.
قبل از اضافه کردن dependency سنگین جدید audit انجام بده.


==================================================
12. ANALYSIS POINTS ON CHART
==================================================

نقاط/رویدادهایی که Analysis Engine V5.4 واقعاً تولید کرده
باید قابل نمایش روی Candlestick Chart باشند.

IMPORTANT:

Frontend حق تولید Signal Point ندارد.

هر Marker باید از Analysis Snapshot معتبر آمده باشد.

Possible marker types are based ONLY on actual Engine output:

DOLLAR_TO_GOLD
GOLD_TO_DOLLAR
HOLD

یا سایر markerهای تأییدشده موجود در V5.4.

هر marker باید حداقل به این موارد متصل باشد:

report_id
timestamp
result
confidence
analysis_snapshot_id

Marker روی timestamp واقعی Analysis قرار گیرد.

با tap/click:

Mini Analysis Card باز شود:

- Result
- Time
- Confidence
- one-line reason
- View Full Analysis


==================================================
13. PREMIUM CHART OVERLAY CONTROL
==================================================

Premium user باید بتواند Analysis Overlay را روشن/خاموش کند.

Control:

[✓] نقاط تحلیل زرسیگنال

OFF:
Candlestick chart بدون Analysis Marker.

ON:
Approved Analysis Markers نمایش داده شوند.

Preference کاربر ذخیره شود.

Professional در صورت پشتیبانی Engine می‌تواند filterهای بیشتری داشته باشد.

مثلاً:

☑ تغییر دلار به طلا
☑ تغییر طلا به دلار
☐ HOLD

اما فقط اگر UX بعد از بررسی مناسب بود.

روی موبایل chart را با marker زیاد خفه نکن.

اگر markerها متراکم هستند:
- clustering
- priority
- timeframe filtering

را بررسی کن.

هیچ Marker را حذف یا جابه‌جا نکن که تاریخچه تحلیل را تحریف کند.


==================================================
14. HISTORICAL INTEGRITY
==================================================

Marker تاریخی باید نشان دهد:

در همان زمان سیستم چه تحلیلی داشته است.

تحلیل گذشته را با داده امروز دوباره نساز.

Analysis Snapshot باید historical/auditable باشد.

Price(T)
+
Bubble(T)
+
Analysis(T)
+
FormulaVersion(T)

باید قابل بازسازی و Audit باشد.

اگر Analysis در Warning Window ساخته شده:
Marker/Detail باید نشان دهد:

«خارج از بازه استاندارد تحلیل»

تا کاربر بعداً تصور نکند این Analysis استاندارد بوده است.


==================================================
15. CHART ACCESS BY PLAN
==================================================

FREE:
- chart پایه
- history محدود
- بدون Full Analysis Overlay یا فقط preview محدود

HOME:
- candlestick chart
- Analysis Overlay
- history مطابق entitlement
- marker detail

PROFESSIONAL:
- تمام Home
- history عمیق‌تر
- Implied/Actual USD comparison overlays where approved
- overall trend overlays where approved
- advanced filters

Formula هیچ‌جا نمایش داده نشود.


==================================================
16. ALERT ARCHITECTURE
==================================================

Alert architecture باید قابلیت آینده برای:

PRICE_THRESHOLD
BUBBLE_THRESHOLD
RELATIVE_GAP_THRESHOLD
ANALYSIS_STATE_CHANGE

داشته باشد.

اما:

ANALYSIS_STATE_CHANGE
= EXPERIMENTAL

فعلاً Production activation نکن.

اول باید با داده تاریخی/واقعی تست شود و مجتبی تأیید کند.


==================================================
17. SMS / WHATSAPP / IN-APP
==================================================

UX Alert Settings می‌تواند طراحی شود.

Possible channels:

- In-App
- SMS
- WhatsApp

اما Production sending فقط زمانی فعال شود که:

- provider approved
- user consent implemented
- throttling implemented
- unsubscribe/disable implemented
- delivery status implemented
- alert rule approved

پیامک نباید گزارش کامل باشد.

Example:

«زرسیگنال:
وضعیت تحلیل طلای شما تغییر کرده است.
مشاهده گزارش: [Deep Link]»

Deep Link باید مستقیماً report مربوطه را باز کند.

نه Homepage.


==================================================
18. WATCHLIST
==================================================

برای کاربران پولی:

«دیده‌بان من»

هدف:

کاربر در کمتر از 10 ثانیه بفهمد
از آخرین بازدید چه چیز مهمی تغییر کرده است.

هر row:

Asset
Current Result
Current Price
Current approved Gap/Bubble
Last Analysis Change
Alert status

UX مرجع‌های دیده‌بان را می‌توان بررسی کرد،
اما UI آنها را کپی نکن.


==================================================
19. NO FAKE DATA / NO FAKE CAPABILITIES
==================================================

هر قابلیت Backend که آماده نیست باید یکی از این وضعیت‌ها را داشته باشد:

READY
PAYWALLED
COMING_SOON
SPEC_BLOCKED
DATA_UNAVAILABLE

هیچ داده، Signal، Confidence، Trend،
Testimonial، Win Rate یا Alert ساختگی تولید نکن.

اگر Engine field را نمی‌دهد:
UI آن را اختراع نکند.


==================================================
20. ASTRA EXECUTION ORDER
==================================================

همه چیز را یک‌جا نساز.

ابتدا Repo/Engine Contract را audit کن.

PHASE A:
- V5.4 output contract audit
- existing Analysis API
- Confidence field
- Reason Codes
- Snapshot model
- existing chart stack
- entitlement model

گزارش بده:
IMPLEMENTED
READY_TO_CONNECT
READY_TO_BUILD
SPEC_BLOCKED

PHASE B:
- Mobile Analysis Report
- three-tier presentation
- Time Reliability Gate
- Admin Analysis Time Settings
- acknowledgement persistence

PHASE C:
- Candlestick Chart
- historical Analysis Markers
- Premium Overlay ON/OFF
- marker detail → Full Report

PHASE D:
- Watchlist
- alert settings UX
- notification infrastructure

ANALYSIS_STATE_CHANGE production activation:
DO NOT ENABLE.

نیازمند تست و تأیید مجتبی است.


==================================================
21. ACCEPTANCE TESTS
==================================================

Test Tehran time boundaries:

20:59 → STANDARD
21:00 → WARNING
23:59 → WARNING
00:00 → WARNING
09:59 → WARNING
10:00 → STANDARD
10:01 → STANDARD

Admin change test:
اگر Admin window را تغییر داد، backend و UI باید config جدید را
بدون hard-coded frontend logic رعایت کنند.

Mobile:
360px
390px
430px

Test:
- result visible first viewport
- CTA visible
- warning modal usable
- chart usable
- marker tap usable
- overlay toggle usable
- no horizontal overflow

Security:
- Free user cannot obtain Professional fields merely by modifying UI.
- Entitlement must be enforced server-side.
- Formula/IP must not be leaked through public API responses.
- Admin settings require server-side Admin authorization.

Finally report:

1. Existing capabilities
2. Files changed
3. DB migrations
4. API changes
5. screenshots mobile/desktop
6. tests
7. remaining blockers
8. anything requiring Mojtaba/Navid approval

Do not silently make product decisions.
