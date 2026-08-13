# SkunkScan website — standalone Railway service.
#
# Unlike packages/feed (which needs the repo root as build context for its
# workspace:* dependencies), this package has zero workspace dependencies -
# every dependency is a normal npm package (see package.json) - so the build
# context is just this directory. Railway's "Root Directory" for this
# service must be set to packages/skunkscan-web (railway.json's
# dockerfilePath is relative to that).
FROM oven/bun:1 AS build

WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .

# Vite bakes import.meta.env values into the bundle at BUILD time, not
# runtime - so VITE_SKUNKSCAN_API_BASE_URL (see TrustCheckWidget.tsx) must
# be available here, not just when serve.ts runs later. Railway injects a
# service's configured environment variables as build args automatically
# for Dockerfile builds, matching this ARG's name - set
# VITE_SKUNKSCAN_API_BASE_URL as a variable on this Railway service.
ARG VITE_SKUNKSCAN_API_BASE_URL
ENV VITE_SKUNKSCAN_API_BASE_URL=$VITE_SKUNKSCAN_API_BASE_URL

RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/serve.ts ./serve.ts

EXPOSE 4466
CMD ["bun", "run", "serve.ts"]
