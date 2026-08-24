FROM node:24.19.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM node:24.19.0-bookworm-slim AS runtime
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node hardhat.config.js ./
COPY --chown=node:node contracts ./contracts
COPY --chown=node:node scripts/deployCredentialRegistry.js ./scripts/deployCredentialRegistry.js
COPY --chown=node:node scripts/localDeploymentLifecycle.js ./scripts/localDeploymentLifecycle.js
RUN mkdir -p artifacts cache deployments && chown -R node:node /app
USER node
EXPOSE 8545
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 CMD ["node", "-e", "fetch('http://127.0.0.1:8545',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]}),signal:AbortSignal.timeout(2000)}).then(r=>r.json()).then(x=>{if(x.result!=='0x7a69')process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["./node_modules/.bin/hardhat", "node", "--hostname", "0.0.0.0"]
