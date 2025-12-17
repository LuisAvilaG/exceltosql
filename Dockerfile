# 1. Installer Stage: Install dependencies
FROM --platform=linux/amd64 node:20-alpine AS installer
WORKDIR /app

COPY package.json ./
COPY --if-exists yarn.lock ./
COPY --if-exists pnpm-lock.yaml ./

# Install dependencies based on which lock file exists
RUN if [ -f pnpm-lock.yaml ]; then \
      npm install -g pnpm && pnpm install; \
    elif [ -f yarn.lock ]; then \
      yarn install; \
    else \
      npm install; \
    fi


# 2. Builder Stage: Build the Next.js application
FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from the installer stage
COPY --from=installer /app/node_modules ./node_modules
COPY package.json ./

# Copy the rest of the application source code
COPY . .

# Run the build command
RUN npm run build


# 3. Runner Stage: Create the final, small production image
FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the necessary files for a standalone Next.js app
COPY --from=builder /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set the user to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint to run the Next.js server
CMD ["node", "server.js"]
