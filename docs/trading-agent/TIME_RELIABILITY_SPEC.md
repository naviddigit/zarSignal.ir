# TIME_RELIABILITY_SPEC

Status: APPROVED supplied time rule and user-specific acknowledgement model; implementation not started
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 13, 14, 15.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

13 — TIME RELIABILITY
==================================================

APPROVED BY MOJTABA.

Timezone:

Asia/Tehran

Default Warning Window:

21:00 → 10:00

STANDARD:

10:00 <= Tehran Time < 21:00

WARNING:

21:00 <= Tehran Time < 24:00
OR
00:00 <= Tehran Time < 10:00

User can request analysis 24/7.

During WARNING window:

1. User requests Analysis.
2. Do not expose Analysis immediately.
3. Show reliability warning.
4. Require explicit acknowledgement.
5. If accepted, show Analysis.
6. Keep warning state visible on the report.

Approved Persian UX intent:

«هشدار اعتبار تحلیل

در این بازه زمانی نرخ‌های اصلی بازار ممکن است هنوز از اعتبار
و ثبات کافی برای تحلیل استاندارد برخوردار نباشند.

بازه اصلی و قابل اتکاتر تحلیل زرسیگنال از ساعت ۱۰:۰۰ صبح
تا ۲۱:۰۰ به وقت تهران است.

در صورت تمایل همچنان می‌توانید تحلیل فعلی را مشاهده کنید.»

Actions:

[مشاهده تحلیل با پذیرش هشدار]
[فعلاً نمایش نده]

PRE/WARNING must NOT modify V5.4 Confidence unless V5.4 explicitly says so.



14 — ADMIN TIME SETTINGS
==================================================

Implement with existing ZarSignal Design System.

Suggested:

/admin/analysis-settings

Settings:

timezone = Asia/Tehran

warning_start = 21:00
warning_end = 10:00

Admin can change Start/End.

Requirements:

- HH:mm validation
- overnight ranges supported
- invalid/equal range rejected
- server-side Admin authorization
- DB persistence
- Audit Log

Audit:

updated_at
updated_by
previous_value
new_value

Frontend must NOT hard-code 21:00/10:00.

If config unavailable:

fallback to APPROVED DEFAULT:

Asia/Tehran
21:00 → 10:00



15 — ACKNOWLEDGEMENT MODEL
==================================================

Do NOT mutate a shared Analysis Snapshot merely because one user accepted
a warning.

Analysis Snapshot = shared immutable engine fact.

User acknowledgement = user/request-specific record.

Recommended:

AnalysisAcknowledgement

id
user_id
report_id
warning_policy_version
acknowledged_at
request_id

This prevents User A's acknowledgement from appearing as User B's.
