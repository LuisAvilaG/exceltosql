# Dockerfile

# 1. Builder stage: Build the Next.js application
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Install dependencies
# Copy package.json and lock file
COPY package.json ./
# Use package-lock.json if it exists
COPY
--if-exists=package-lock.json ./
# Use yarn.lock if it exists
COPY --if-exists=yarn.lock ./
# Use pnpm-lock.yaml if it exists
COPY --if-exists=pnpm-lock.yaml ./

# Install dependencies based on lock file
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
    else npm install; fi

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN npm run build

# 2. Runner stage: Create the final, lightweight image
FROM node:20-slim AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy built app from builder stage
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Conditionally copy public folder only if it exists in the builder stage
COPY --from=builder --if-exists /app/public ./public


# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["npm", "start", "-p", "3000"]
