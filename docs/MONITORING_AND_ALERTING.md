# Monitoring and Alerting

Scrape protected metrics, poll `/health/live` and `/health/ready`, and collect structured stdout logs with request/correlation IDs. Do not expose metrics publicly.

Configure alerts for backend/liveness unavailable, readiness failure, database unavailable/pool exhaustion, blockchain RPC/transaction failures, IPFS failure/latency, authentication lockout or rate-limit anomaly, repeated 5xx, backup job/age/checksum failure, and host/object-store capacity. Each alert needs severity, sustained threshold, owner, runbook and recovery notification. The operator must supply the monitoring/log platform, credentials, retention, alert destinations and on-call ownership; Phase 13 invents none.
