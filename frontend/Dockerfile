FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_CALENDARY_PUBLIC_SLUG
ARG VITE_CALENDARY_WORKSPACE_ID
ENV VITE_CALENDARY_PUBLIC_SLUG=${VITE_CALENDARY_PUBLIC_SLUG}
ENV VITE_CALENDARY_WORKSPACE_ID=${VITE_CALENDARY_WORKSPACE_ID}
RUN bun run build

FROM oven/bun:1-alpine
RUN addgroup -S calendary && adduser -S calendary -G calendary
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/server.ts ./src/server.ts

USER calendary
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
