# Profile completion — October 15, 2026

- Activity area replaces the free-text activity city. Keep the existing `city` storage key with only the three explicit choices in `activityAreas`; do not infer an area from a legacy city or IP.
- Age group replaces occupation in forms, admin detail and required-field settings. It has a separate nullable `User.ageGroup` column; legacy occupation data is preserved and never interpreted as age. Old occupation requirements are removed when policy is parsed; admins can require ageGroup explicitly.
- Use the shared Select / OverlaySheet for both fields (desktop modal and mobile drawer). Empty optional selections remain empty; never preselect an age or area.
- Keep server option validation, the additive migration and ensureAccountSchema initializer before reads. Profile completion and API/page requirements must read ageGroup consistently.
