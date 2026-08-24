FROM node:24.19.0-bookworm-slim AS node-runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM postgres:18.0-bookworm
COPY --from=node-runtime /usr/local/ /usr/local/
WORKDIR /app
COPY --from=node-runtime --chown=1000:1000 /app/package.json /app/package-lock.json ./
COPY --from=node-runtime --chown=1000:1000 /app/node_modules ./node_modules
COPY --chown=1000:1000 scripts ./scripts
RUN groupadd --gid 1000 node && useradd --uid 1000 --gid 1000 --create-home node \
    && mkdir -p /backups /restore-test \
    && chown -R node:node /app /backups /restore-test
USER node
CMD ["node", "scripts/backupDatabase.js"]
