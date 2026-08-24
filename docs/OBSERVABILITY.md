# Observability

Each request receives validated `X-Request-ID` and `X-Correlation-ID` values (safe ASCII, at most 100 characters), generated as UUIDs when absent or invalid. Both headers are returned and included in operational logs. Request logs contain metadata only—never bodies, query values, uploads, tokens, or document contents.

Operation timing records durations only. Slow thresholds are configurable through the Stage 24 environment variables. Metrics use bounded labels and default Node process metrics.

Operational logs and immutable PostgreSQL business audit records are separate systems. Operational correlation does not replace audit evidence.
