FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN mkdir /app/data
RUN touch /app/data/chat-lounge.db
RUN pnpm build
RUN pnpm prune --production

FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "build"]
