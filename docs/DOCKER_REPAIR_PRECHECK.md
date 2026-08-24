# Docker Repair Precheck

Captured: 2026-08-06 (Africa/Harare)

## Safety pass status

The pre-repair source and Docker evidence pass completed without repairing, resetting, pruning, or deleting Docker resources. Docker and WSL were running during capture, so the Docker VHDX files were inventoried but were not copied.

## Source preservation

- Source backup: `C:\Users\HYDRA\Desktop\ZSVP-Pre-Docker-Repair-Backup-20260806-092318`
- Backup verification: passed; 261 files and 1,428,209 bytes
- Full manifest: `BACKUP-MANIFEST.sha256` (260 entries; the manifest does not hash itself)
- Critical source inventory: `SOURCE-HASHES.sha256` (20 entries)
- Package verification: root and frontend `package.json` and `package-lock.json` files are present, non-zero, and valid JSON in both the source and backup
- Git bundle: not created because this project copy has no `.git` directory
- Secret exclusions: `.env`, `.env.docker`, key files, database dumps, backup data, and restore-test output were excluded
- Template scan: 70 safe configuration/documentation files scanned; zero recognizable real-secret findings

## Host and Docker inventory

- Windows: Windows 11 Home Single Language, version 10.0.26200, build 26200
- WSL: 2.7.11.0; kernel 6.18.33.2-2; default version 2
- Running WSL distribution: `docker-desktop`, WSL version 2
- Docker Desktop: 4.72.0.225998
- Docker Client: 29.4.2
- Docker Engine: 29.4.2
- Docker context: `desktop-linux`
- Docker data root: `/var/lib/docker`
- Docker storage driver: `overlayfs`
- Drive C filesystem: NTFS
- Drive C free space at capture: 1,493,360,640 bytes (about 1.49 GB)
- Physical memory: 16,905,969,664 bytes total; 2,458,456,064 bytes free at capture

The very low free space on drive C is a material risk and is consistent with Docker content-store write failures. This is an inference, not a completed root-cause diagnosis.

## Docker diagnostics

- Installed tool: `C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe`
- Deprecated `check` command: returned a message directing use of `gather`
- `gather`: stopped after the required 30-second limit
- Diagnostic ID: not captured
- Upload: not attempted
- Recent known errors:
  - Docker Desktop unable to start
  - image-layer extraction ended with EOF
  - containerd content-store `startedat.tmp` write failed with an input/output error
  - prior snapshot/read-only filesystem instability

## Docker VHDX inventory

| Path | Size (bytes) | Last modified |
|---|---:|---|
| `C:\Users\HYDRA\AppData\Local\Docker\wsl\disk\docker_data.vhdx` | 20,946,354,176 | 2026-08-06 09:29:04 |
| `C:\Users\HYDRA\AppData\Local\Docker\wsl\main\ext4.vhdx` | 109,051,904 | 2026-08-06 09:09:46 |

VHDX backup location: deferred. Docker Desktop and `docker-desktop` WSL were running, and drive C does not have enough free space for a second copy. Use a separate destination drive with at least 25 GB free.

### Deferred VHDX copy sequence

Run this only after explicitly quitting Docker Desktop from its tray menu:

```powershell
wsl --shutdown
wsl --list --running
Get-Process -Name 'Docker Desktop','com.docker.backend','com.docker.build' -ErrorAction SilentlyContinue
```

Proceed only when the WSL running list is empty and no Docker processes are returned. Replace `E:` below with a verified backup drive that has sufficient free space:

```powershell
$DockerVhdxBackup = 'E:\Docker-WSL-Backup-20260806'
New-Item -ItemType Directory -Path $DockerVhdxBackup
robocopy 'C:\Users\HYDRA\AppData\Local\Docker\wsl' "$DockerVhdxBackup\wsl" *.vhdx /S /COPY:DAT /DCOPY:DAT /R:1 /W:1
Get-ChildItem -Recurse -File 'C:\Users\HYDRA\AppData\Local\Docker\wsl' -Filter *.vhdx | Select-Object FullName,Length
Get-ChildItem -Recurse -File "$DockerVhdxBackup\wsl" -Filter *.vhdx | Select-Object FullName,Length
```

Hashing the approximately 21 GB data VHDX is optional and may take considerable time. Never delete, rename, mount, truncate, or overwrite the source VHDX during backup.

## Expected persistent resources

- `zsvp_application_logs`
- `zsvp_deployment_metadata`
- `zsvp_generated_pdf`
- `zsvp_generated_qr`
- `zsvp_postgres_data`

All five volumes were visible during this capture.

## Last known development database baseline

| Table | Count |
|---|---:|
| users | 1 |
| institutions | 1 |
| students | 1 |
| credentials | 0 |
| verification_logs | 0 |
| audit_logs | 1 |

These are recorded baseline values; no database query or mutation was performed during this pass.

## Last known images and sizes

| Image | Last known size |
|---|---:|
| backend | 98.73 MB content size; Docker CLI currently displayed 436 MB |
| frontend | 21.27 MB content size; Docker CLI currently displayed 74.9 MB |
| blockchain | 414.28 MB content size; Docker CLI currently displayed 1.9 GB |
| backup | 225.39 MB content size; Docker CLI currently displayed 934 MB |
| migration | Docker CLI currently displayed 436 MB |
| contract-deploy | Docker CLI currently displayed 1.9 GB |
| test_runner | Docker CLI currently displayed 1.46 GB |

Docker Desktop's containerd image view can report shared/virtual sizes differently from image-inspection content sizes. No image was exported or rebuilt during this pass.

## Captured project runtime inventory

- Healthy/running at capture: PostgreSQL, blockchain, frontend
- Restarting at capture: backend
- Exited: migration, contract-deploy, test PostgreSQL, test blockchain
- Project networks: `zsvp_application`, `zsvp_data`, `zsvp-test_test`

No container was started, stopped, restarted, or removed during capture.

## Commands that must not be run

- `docker system prune`
- `docker builder prune`
- `docker image prune`
- `docker container prune`
- `docker volume prune`
- `docker network prune`
- `docker compose down -v`
- `wsl --unregister`
- Docker Desktop factory reset or clean/purge data

Do not delete, rename, move, mount, truncate, or overwrite Docker VHDX files. Do not modify `.env`, `.env.docker`, application business logic, smart contracts, or migrations.

## Safe repair or reinstall sequence

1. Keep the verified source backup unchanged.
2. Free substantial space on drive C by moving or deleting only unrelated, understood, recoverable personal files. Do not use Docker cleanup commands and do not manipulate Docker's VHDX.
3. Quit Docker Desktop normally from its tray menu.
4. Run `wsl --shutdown`, then confirm `wsl --list --running` is empty.
5. Copy both Docker VHDX files to a separate drive using the deferred procedure above and verify source/destination sizes.
6. Start Docker Desktop once and test only bounded client/server health. If it remains unstable, quit it and shut down WSL again.
7. Use the official Docker Desktop installer repair path if available. Do not select factory reset, clean/purge data, or removal of WSL data.
8. If repair is unavailable, reinstall Docker Desktop without deleting `%LOCALAPPDATA%\Docker\wsl` or unregistering WSL distributions. Preserve the VHDX backup throughout.
9. Do not deploy and do not begin Stage 28.

## VHDX restoration only if volumes do not return

Do not restore merely because Docker initially starts without containers. First verify the active Docker context and volume inventory. If the five expected volumes are genuinely absent, stop Docker Desktop and WSL, preserve the newly created post-repair VHDX files separately, and obtain explicit authorization before replacing anything. Restore only from the verified VHDX backup, preserve the original directory structure, compare sizes, and start Docker once. VHDX replacement is destructive and must not be automated as part of routine repair.

## Post-repair verification and Stage 27 resume checklist

1. Confirm WSL responds.
2. Confirm Docker Client and Server respond within 30 seconds.
3. Confirm all five `zsvp_*` volumes.
4. Confirm project source hashes match `SOURCE-HASHES.sha256`.
5. Confirm root/frontend package files remain non-zero and valid JSON.
6. Inventory project images and containers.
7. Start the stack without deleting volumes.
8. Verify Stage 26 PostgreSQL, blockchain, contract-bytecode, backend, and frontend health.
9. Repair only the corrupt `test_runner` image if necessary.
10. Run the Docker test profile.
11. Run image secret and vulnerability scans.
12. Verify development database count parity.
13. Complete the Stage 27 report.
14. Do not start Stage 28 until Stage 27 passes.

