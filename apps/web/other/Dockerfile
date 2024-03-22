# Always assume the context is the root of the project
# In a monorepo, the context is the root of the monorepo

# 1. setup base. all layers inherit from this
FROM node:20-alpine as base
# From turborepo docs: https://turbo.build/repo/docs/handbook/deploying-with-docker
RUN apk update
RUN apk add --no-cache libc6-compat
# (Optional: if using litefs): https://fly.io/docs/litefs/getting-started-docker/
RUN apk add ca-certificates fuse3 sqlite
# (Optional: if using prisma) Install openssl for Prisma
RUN apk add openssl
ARG STORE_PATH=~/.pnpm-store
# Setup pnpm and turbo on the alpine base. These will be available in all layers that inherit from this
RUN corepack enable pnpm
# Enable `pnpm add --global` on Alpine Linux by setting
# home location environment variable to a location already in $PATH
# https://github.com/pnpm/pnpm/issues/784#issuecomment-1518582235
ENV PNPM_HOME=/usr/local/bin
RUN pnpm config set store-dir ${STORE_PATH}
RUN pnpm install -g turbo
ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

# 2. Prune projects. Since this is a monorepo, we need to decide which projects to include in the final image
FROM base AS pruner
ARG PROJECT
WORKDIR /app
COPY . .
RUN turbo prune --scope=${PROJECT} --docker


# 3. A dependency layer containing only the lockfile and package.json's of the pruned project
# Useful for caching as these files don't change often
FROM base AS deps-base
ARG PROJECT
WORKDIR /app
# Note: pruned json files also include npmrc from that project
COPY --from=pruner /app/out/json/ .
# Copy lockfile and package.json's of isolated subworkspace
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# 3.a Contains only production dependencies.
# NOTE: The reason we dont use `pnpm prune --prod` is it does not support recursive
# exection in a monorepo. See: https://pnpm.io/cli/prune
FROM deps-base as production-deps
WORKDIR /app
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=pnpm,target=${STORE_PATH} pnpm install --prod --prefer-offline --frozen-lockfile
# Note: This is only so that the generated prisma is included in node_modules of production
RUN pnpm run prebuild --filter=${PROJECT}


# 3.b Build the app. Contains the source code and the built app of the pruned project
FROM deps-base as builder
WORKDIR /app
# Copy source code of isolated subworkspace
COPY --from=pruner /app/out/full/ .
RUN --mount=type=cache,id=pnpm,target=${STORE_PATH} pnpm install --prefer-offline --frozen-lockfile
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN)
RUN --mount=type=secret,id=SENTRY_ORG export SENTRY_ORG=$(cat /run/secrets/SENTRY_ORG)
RUN --mount=type=secret,id=SENTRY_PROJECT export SENTRY_PROJECT=$(cat /run/secrets/SENTRY_PROJECT)
RUN pnpm run prebuild --filter=${PROJECT}
RUN pnpm run build --filter=${PROJECT}

# 4. Finally, build the production image with minimal footprint
# In a monorepo, the guiding principle is that the final step:
# a. Assume that it no longer has access to the source code of the entire monorepo.
# With this assumption, it shouldn't use paths that are specific to the monorepo
# nor copy anything from the root workspace.
# b. It should only copy the necessary files from the pruned project 
# and anything it needs from the previous layers
# This makes it easy to move the pruned project to a different monorepo or to a different project entirely
FROM base AS runner

ENV FLY="true"
ENV LITEFS_DIR="/litefs/data"
ENV DATABASE_FILENAME="sqlite.db"
ENV DATABASE_PATH="$LITEFS_DIR/$DATABASE_FILENAME"
ENV DATABASE_URL="file:$DATABASE_PATH"
ENV CACHE_DATABASE_FILENAME="cache.db"
ENV CACHE_DATABASE_PATH="$LITEFS_DIR/$CACHE_DATABASE_FILENAME"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
ENV NODE_ENV="production"
# For WAL support: https://github.com/prisma/prisma-engines/issues/4675#issuecomment-1914383246
ENV PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1"

# add shortcut for connecting to database CLI
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

WORKDIR /app

COPY --from=production-deps /app/package.json ./package.json
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/apps/web/package.json ./apps/web/package.json
COPY --from=production-deps /app/apps/web/node_modules ./apps/web/node_modules
# This is run by fly before releasing a deployment. Used by fly.toml and litefs.yml
COPY --from=builder /app/apps/web/other ./apps/web/other
COPY --from=builder /app/apps/web/index.js ./apps/web/index.js
COPY --from=builder /app/apps/web/server-build ./apps/web/server-build
COPY --from=builder /app/apps/web/build ./apps/web/build
COPY --from=builder /app/apps/web/app/components/ui/icons ./apps/web/app/components/ui/icons
# Optional, only if using Prisma
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma

# prepare for litefs
COPY --from=flyio/litefs:0.5.11 /usr/local/bin/litefs /usr/local/bin/litefs
COPY --from=builder /app/apps/web/other/litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

# https://fly.io/docs/litefs/getting-started-docker/#running-litefs
# Only if using litefs, see litefsy.yml for more detail. 
# The yml contains the command to run the server
CMD ["litefs", "mount"]
