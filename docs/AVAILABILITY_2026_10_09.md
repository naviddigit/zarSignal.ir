# Availability investigation — 2026-10-09

## Confirmed evidence

- Customer screenshots show `ERR_CONNECTION_RESET` before the document loads and while requesting Next RSC data / JavaScript chunks. Calculator `ChunkLoadError` reaches the error boundary. These are separate from the boot splash.
- Public compact quote cards requested paid 30-day history and received 403. Fixed to request the free one-day window without weakening paid-history access controls. Missing history stays empty.
- Shared navigation and home/footer links no longer prefetch unused pages. Recovery button reloads the document, since resetting the boundary alone cannot recover failed chunks.
- DNS resolves both public hostnames to Cloudflare IPv4 addresses 104.21.36.219 and 172.67.199.199, plus IPv6. From the test machine, HTTPS succeeds through both Cloudflare addresses and both Vercel origin addresses (216.198.79.1 and 64.29.17.1). This does not establish reachability on affected customer networks.
- Verified alternative production alias: https://zar-signal-ir.vercel.app (version endpoint matches www). Compare this URL and www on the same affected connection to distinguish routes; this alias is a diagnostic, not a permanent replacement for auth/payment domains.

## Iran probe results and limits

Eight Iran HTTP probes: six returned 200, two timed out. All eight connected to Vercel TCP port 443. The two failing HTTP probes ALSO timed out for Arvancloud, example.com and HTTP, so their failures cannot identify Cloudflare or Vercel as the cause. TCP success alone does not prove HTTPS works.

- Public homepage: https://check-host.net/check-report/4fda68b9kb67
- Static logo: https://check-host.net/check-report/4fda68d4k2f1
- Vercel TCP: https://check-host.net/check-report/4fda68f0kb91
- Alternative production alias: https://check-host.net/check-report/4fda7d9fk616
- Arvan control: https://check-host.net/check-report/4fda8d91ka6b
- Example.com control: https://check-host.net/check-report/4fda8d9ck7f1

## Next operational investigation

Inspect Cloudflare security events and Vercel request/runtime logs at an affected user's exact timestamp. Compare www versus the verified Vercel alias on that user's ISP without VPN. Test apex/www and IPv4/IPv6 separately. A controlled DNS-only trial can isolate the Cloudflare proxy, but requires panel access, checking Vercel custom-domain configuration, and re-testing the affected ISP; do not silently change DNS or disable security based on generic probes.

No evidence currently proves Hobby quotas are responsible. Upgrading Vercel, buying Arvan hosting or changing DNS is not a verified fix. Code fixes above mitigate genuine application issues but cannot repair a reset network connection.
