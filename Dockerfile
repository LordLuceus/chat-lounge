FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

# Keep in sync with "packageManager" in package.json
RUN npm install -g pnpm@12.3.4

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
RUN pnpm prune --production

FROM node:24-slim

WORKDIR /app

# Stockfish gives the chat models a chess engine (see src/lib/server/chess/)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates stockfish \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/run.sh ./run.sh

ENV NODE_ENV=production
ENV CHESS_ENGINE_PATH=/usr/games/stockfish

EXPOSE 3000
EXPOSE 4001

CMD ["./run.sh"]
