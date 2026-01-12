# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN npm i -g pnpm

# Builder stage
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:server
# Build the web frontend
WORKDIR /app/web
RUN npm ci
RUN npm run build
# Move web build to server public folder or serve strategy
# Assuming server serves static files from 'web/dist' or similar
# Based on current setup, we need to ensure the server knows where to serve from.
# Check server.ts/app.ts for static file serving logic. 
# For now, we'll keep the build artifact available.

# Runner stage
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# Copy web build assets if the server serves them
COPY --from=builder /app/web/dist ./web/dist 
# Copy other necessary files
COPY --from=builder /app/src/i18n ./dist/i18n
COPY --from=builder /app/drizzle ./drizzle

# Expose API port
EXPOSE 3000

CMD ["npm", "start"]
