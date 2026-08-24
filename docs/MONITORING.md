# Monitoring

Prometheus-format metrics are disabled unless `ENABLE_METRICS=true`. The configured route (default `/metrics`) always requires a current `super_admin` bearer session. Labels are limited to controlled method, route-template, status-class, operation, result, and reason values; personal and credential identifiers are prohibited.

Use `/health` for a minimal public check, `/health/live` for process liveness, and `/health/ready` for bounded database, filesystem, configured IPFS, and configured blockchain readiness. Detailed legacy health routes remain super-admin-only.

Alert hooks cover dependency outages, elevated failures/latency, reconciliation, and log writes. The default transport is a no-op and reports `delivered: false`.
