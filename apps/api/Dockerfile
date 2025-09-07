# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm -w install --frozen-lockfile || pnpm -w install

FROM deps AS build
WORKDIR /app
RUN pnpm --filter @incident/api prisma:generate
COPY apps/api/ ./apps/api/
RUN pnpm --filter @incident/api build

FROM base AS runner
WORKDIR /app
ENV PORT=4100
EXPOSE 4100
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
CMD ["node", "apps/api/dist/index.js"]

