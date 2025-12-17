# 1. Builder Stage
# This stage builds the Next.js application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
# We copy package.json and lock files first to leverage Docker cache
COPY package.json ./
COPY --if-exists package-lock.json ./
COPY --if-exists yarn.lock ./
RUN npm install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application
# The output will be in the .next folder
RUN npm run build

# 2. Runner Stage
# This stage creates the final, lightweight production image
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment variables for production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
# The `nextjs` user is created with a home directory at /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The standalone output is self-contained and doesn't need node_modules
# It includes a minimal server.js file
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set the user to the non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set the entrypoint to start the app
CMD ["node", "server.js"]
