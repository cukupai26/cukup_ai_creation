# Production multi-stage Dockerfile for Google Cloud Run
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies for build
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Build production bundle (Vite + PWA assets)
ENV NODE_ENV=production
RUN npm run build

# --- Production Runner Stage ---
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy application files and node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public

# Cloud Run listens on port 8080 by default
EXPOSE 8080

# Start server natively with Node 22 TypeScript stripping
CMD ["node", "--experimental-strip-types", "server.ts"]
