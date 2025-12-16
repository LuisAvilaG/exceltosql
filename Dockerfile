# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS base

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# --- Dependencies ---
FROM base AS deps
# Install dependencies
RUN npm install

# --- Builder ---
FROM base AS builder
# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code
COPY . .

# Build the Next.js application for production
RUN npm run build

# --- Runner ---
FROM base AS runner
# Set the NODE_ENV to production
ENV NODE_ENV=production

# Copy the built Next.js application from the 'builder' stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# The command to start the application
CMD ["npm", "start"]
