# Docker security

Backend, blockchain, tools, and test images run as the Node user; the frontend uses unprivileged Nginx UID 101. Services drop Linux capabilities where compatible, enable `no-new-privileges`, avoid privileged mode and Docker socket mounts, and bind published development ports to loopback. Production application roots are read-only with explicit temporary filesystems.

Docker ignore files exclude real environments, Git metadata, dependencies, backups, logs, uploads, coverage, and test artifacts. The frontend accepts only the public API base URL at build time. Image scanning requires a running engine or registry scanner and is not claimed by this stage. Existing npm audit findings in the Hardhat development toolchain remain documented.

Local deployment metadata contains public chain data only and never a private key. The backend mount is read-only. Deployment logs must not print signer keys, RPC credentials, or environment dumps. Production does not activate the local Hardhat profile or automatic deployment job.
