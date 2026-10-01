# Slim mobile handoff (source only)

Creates a tiny zip of `apps/mobile` without `node_modules`, `.expo`, or secrets.
Install deps on the target machine with `npm install`.

Usage (PowerShell from repo root):

```powershell
powershell -ExecutionPolicy Bypass -File apps/mobile/scripts/pack-slim.ps1
```

Output lands on Desktop as `ZarSignal-Mobile-Slim.zip`.
