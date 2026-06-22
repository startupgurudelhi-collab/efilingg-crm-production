# Use stable Node v20 LTS on lightweight Alpine Linux
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (development dependencies are required to run vite build and esbuild)
RUN npm ci

# Copy application source files
COPY . .

# Unset workspace runtime flags and configure production environment
ENV NODE_ENV=production

# Compile both frontend client and backend server (Vite + esbuild output)
RUN npm run build

# Stage 2: Clean Runner
FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install only production dependencies for smaller image footprint and lower security risk
RUN npm ci --only=production

# Copy compiled artifacts from builder stage (the entire dist directory containing frontend static files and server.cjs)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Some folders might have dynamic file uploads, create them
RUN mkdir -p /app/data /app/uploads

# Expose production port (must be 3000 to match reverse proxy and Cloud Run ingress)
EXPOSE 3000

ENV PORT=3050
ENV NODE_ENV=production

# Boot the unified production application
CMD ["node", "dist/server.cjs"]
