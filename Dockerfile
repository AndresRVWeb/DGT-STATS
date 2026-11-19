# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for Vite & TypeScript build)
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build the client bundle (Vite SPA)
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps && npm install tsx --legacy-peer-deps

# Copy built frontend assets and server files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create directory for local fallback cache if database is not reachable
RUN mkdir -p /app/.dgt-cache && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
