FROM node:24.19.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24.19.0-bookworm-slim AS admin-tools
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node backend ./backend
COPY --chown=node:node scripts/bootstrapAdmin.js scripts/resetAdminPassword.js scripts/adminOperations.js ./scripts/
USER node
CMD ["node", "--version"]

FROM node:24.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --chown=node:node package.json ./
COPY --chown=node:node backend ./backend
COPY --chown=node:node scripts/startDockerBackend.js ./scripts/startDockerBackend.js
COPY --chown=node:node docs/openapi.yaml ./docs/openapi.yaml
RUN mkdir -p /app/output/pdf /app/generated/qr /app/logs /app/backend/uploads/certificates-temp && chown -R node:node /app/output /app/generated /app/logs /app/backend/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health/live',{signal:AbortSignal.timeout(2000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "scripts/startDockerBackend.js"]
