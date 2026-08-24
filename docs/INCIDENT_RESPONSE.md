# Incident response

Start with readiness state, then inspect security, error, performance, and application logs using request/correlation IDs. Never copy secrets, request bodies, uploaded documents, environment dumps, or bearer credentials into incident records. Rotate exposed credentials outside this application if disclosure is suspected.

SIGINT, SIGTERM, uncaught exceptions, and unhandled rejections initiate bounded shutdown: stop accepting requests, close HTTP once, close PostgreSQL once, and exit. The no-op alert transport is preparation only and must not be treated as delivered notification.
