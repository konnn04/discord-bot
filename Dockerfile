# Use Node.js LTS
FROM node:20-slim

# Install system dependencies for voice and build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY web/package*.json ./web/

# Install dependencies
RUN npm install --legacy-peer-deps
RUN cd web && npm install

# Copy source code
COPY . .

# Build frontend only
RUN npm run build

# Expose port
EXPOSE 3000

# Start with tsx (runs source directly)
CMD ["npm", "start"]
