FROM node:24.19.0-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
USER node
CMD ["npm", "run", "test:backend"]
