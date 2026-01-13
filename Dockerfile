# Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .


RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Cấu hình biến môi trường cho Mongoose và các biến khác
ENV MONGODB_URI="mongodb+srv://vamnaone:mUvy5dTT1HQYM7Fu@marketing.fyanx.mongodb.net/marketing"
ENV JWT_SECRET="AIR_7f1c8a4c6bb0d4571d9848bcbb60596bff79555a7cb563"
ENV URL="https://dm.s4h.edu.vn/"
ENV API="https://todo.tr1nh.net"
ENV AREA='["hkg1", "sin1"]'
ENV OPENAI_KEY="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"
ENV GEMINI_API_KEY="AIzaSyCQYlefMrueYu1JPWKeEdSOPpSmb9Rceg8"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
