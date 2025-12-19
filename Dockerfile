# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build argument for DATABASE_URL (needed for Prisma 7 migrations)
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Copy package files
COPY package. json pnpm-lock.yaml ./

# Copy prisma files (schema + config)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm prisma generate

# Copy source code
COPY . . 

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy necessary files from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Copy package. json for prisma CLI
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Start script - run migrations then start app
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]