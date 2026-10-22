# =======================================================
# EduFlow Backend Production Multi-Stage Dockerfile
# =======================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies deterministically
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Add curl for health check probe
RUN apk add --no-cache curl

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user and group
USER node

# Copy installed production dependencies from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./

# Copy application source code
COPY --chown=node:node src/ ./src/

# Expose backend service port
EXPOSE 5000

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start production server
CMD ["node", "src/server.js"]
