FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY apps/web/package.json ./apps/web/
RUN npm install --workspaces --if-present
COPY apps/web ./apps/web
RUN npm run build -w apps/web

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "node_modules/.bin/next", "start", "apps/web"]
