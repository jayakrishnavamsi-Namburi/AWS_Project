# SecureProctor Server Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies needed for native modules / build
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R node:node /app

# Use non-root user
USER node

# Expose HTTP / WebSocket port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start server
CMD ["node", "src/server.js"]
