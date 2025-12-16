# Dockerfile

# Stage 1: Builder
# This stage installs dependencies and builds the application
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies based on the lock file
RUN npm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build


# Stage 2: Runner
# This stage creates the final, lightweight production-ready image
FROM node:18-alpine AS runner

# Set the working directory
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from the builder stage
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package.json ./
# The public folder is optional, copy it only if it exists
COPY --from=builder --chown=nextjs:nodejs --if-exists /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Change the owner of the working directory to the new user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set the host to 0.0.0.0 to accept connections from outside the container
ENV HOSTNAME "0.0.0.0"

# The command to start the app
CMD ["node", "server.js"]
