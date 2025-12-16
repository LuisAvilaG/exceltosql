# Dockerfile for a Next.js application

# 1. Builder Stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json ./
# Use package-lock.json if it exists
COPY --if-exists=package-lock.json ./
# Use yarn.lock if it exists
COPY --if-exists=yarn.lock ./
# Use pnpm-lock.yaml if it exists
COPY --if-exists=pnpm-lock.yaml ./
RUN npm install

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# 2. Runner Stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --if-exists /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the app
CMD ["npm", "start"]
