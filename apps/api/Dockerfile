FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

FROM build AS migrate
USER node
ENTRYPOINT ["pnpm", "exec", "prisma"]
CMD ["migrate", "deploy"]

FROM deps AS prod-deps
RUN pnpm prune --prod --ignore-scripts

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 5000 6060
ENTRYPOINT ["node", "--enable-source-maps", "dist/src/main.js"]
