# Use Node.js LTS
FROM node:20-slim

# Install system dependencies for voice, build tools and postgres client
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    build-essential \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first to leverage layer caching
COPY package*.json ./
COPY web/package*.json ./web/

# Install dependencies
RUN npm install --legacy-peer-deps
RUN cd web && npm install

# Copy source code
COPY . .

# Build frontend (if present)
RUN npm run build --if-present

# Add entrypoint script that runs migrations and optional deploy commands
COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN chmod +x /app/scripts/docker-entrypoint.sh

# Expose port used by Fastify
EXPOSE 3000

# Entrypoint runs migrations and then the default CMD
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
