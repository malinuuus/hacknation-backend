# Debian slim instead of Alpine: bcrypt ships prebuilt binaries for glibc only.
ARG NODE_IMAGE=node:24.22.1-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV CI=true
RUN corepack enable

FROM base AS build

# prisma.config.ts requires DATABASE_URL; `prisma generate` never connects to it
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# 🚀 Production server
FROM ${NODE_IMAGE} AS prod
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package.json ./
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist

# Uploaded documents; the compose volume mounted here inherits this ownership
RUN mkdir -p storage/uploads && chown -R node:node storage

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
