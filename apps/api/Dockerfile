FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/opencodeapp-db/package.json ./packages/opencodeapp-db/
COPY packages/opencodeapp-sdk/package.json ./packages/opencodeapp-sdk/
COPY packages/opencodeapp-core/package.json ./packages/opencodeapp-core/
COPY packages/opencodeapp-ext/package.json ./packages/opencodeapp-ext/
COPY packages/opencodeapp-llm/package.json ./packages/opencodeapp-llm/
COPY packages/opencodeapp-agent/package.json ./packages/opencodeapp-agent/
COPY apps/api/package.json ./apps/api/
RUN npm install --workspaces --if-present
COPY . .
RUN npm run build -w packages/opencodeapp-db \
    && npm run build -w packages/opencodeapp-sdk \
    && npm run build -w packages/opencodeapp-ext \
    && npm run build -w packages/opencodeapp-llm \
    && npm run build -w packages/opencodeapp-agent \
    && npm run build -w apps/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/opencodeapp-db/prisma ./packages/opencodeapp-db/prisma

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
