# syntax=docker/dockerfile:1

# ============================================================
# product-service — production image
# ============================================================
# The build context is the REPOSITORY ROOT, not this directory. This is an
# npm-workspaces monorepo and the service imports @ecom/shared and
# @ecom/service-kit through their built dist/ output, so the build needs the
# root manifest and packages/ as well as this service's source.
#
#   docker build -f services/product-service/Dockerfile -t ecom-product-service .
# ============================================================

# ---------- Stage 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# The Next.js storefront is deployed by Vercel and never containerised, so it
# is excluded from the image via .dockerignore. Dropping it from the workspaces
# array as well stops npm resolving a directory that is not in the context, and
# keeps the whole Next/Tailwind toolchain out of a backend image.
COPY package.json ./
RUN node -e "const p=require('./package.json'); p.workspaces=p.workspaces.filter(w=>w!=='web'); require('fs').writeFileSync('package.json', JSON.stringify(p,null,2));"

COPY tsconfig.base.json ./
COPY packages ./packages
COPY services ./services

# `npm install` rather than `npm ci`: the committed lockfile is generated on
# Windows and omits the Linux-only optional binaries.
RUN npm install --no-audit --no-fund

# Shared packages must be compiled before the service that imports them.
RUN npm run build:packages \
  && npm run build --workspace=@ecom/product-service

# Drop dev dependencies so only runtime code is carried into the final stage.
RUN npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4002

# node_modules carries workspace symlinks into packages/, so both are copied.
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/services/product-service/package.json ./services/product-service/
COPY --from=builder --chown=node:node /app/services/product-service/dist ./services/product-service/dist

# The base image ships an unprivileged `node` user — never run as root.
USER node
EXPOSE 4002

# Compose gates `depends_on: service_healthy` on this, and Kubernetes uses the
# same /health endpoint for its readiness probe.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "services/product-service/dist/index.js"]
