FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build
RUN pnpm prune --production

FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/run.sh ./run.sh

ENV NODE_ENV=production

EXPOSE 3000
EXPOSE 4001

CMD ["./run.sh"]
