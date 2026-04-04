FROM node:22-alpine AS deps

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV npm_config_update_notifier=false

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY apps/web/package.json /app/apps/web/package.json
COPY packages/shared/package.json /app/packages/shared/package.json

RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV npm_config_update_notifier=false

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/package.json /app/package.json
COPY --from=deps /app/package-lock.json /app/package-lock.json
COPY --from=deps /app/apps/web/package.json /app/apps/web/package.json
COPY --from=deps /app/packages/shared/package.json /app/packages/shared/package.json

COPY tsconfig.base.json /app/tsconfig.base.json
COPY packages/shared /app/packages/shared
COPY apps/web /app/apps/web

RUN npm run build --workspace @cyber-sim/web

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone /app/
COPY --from=builder /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=builder /app/apps/web/public /app/apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
