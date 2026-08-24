# Backup retention policy

Prototype targets are daily backups for 14 days, weekly backups for 8 weeks, and monthly backups for 12 months. Values are configurable. `npm run retention:dry-run` reports decisions without deletion, targets only configured backup directories, ignores unexpected filenames, and preserves at least one recent manifest-backed dump. Retention never deletes PostgreSQL audit records.
