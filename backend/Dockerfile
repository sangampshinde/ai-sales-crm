# Base Image
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application source
COPY . .

# Expose port
EXPOSE 8000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8000

# Run database push and start application
CMD ["sh", "-c", "npx prisma db push && node server.js"]
