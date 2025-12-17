# 1. Use an official Node.js runtime as a parent image
FROM node:20-slim

# 2. Set the working directory in the container
WORKDIR /app

# 3. Copy package.json and install dependencies
# We copy only package.json first to leverage Docker's cache.
COPY package.json ./
RUN npm install

# 4. Copy the rest of your application's code
COPY . .

# 5. Build the Next.js application
RUN npm run build

# 6. Expose the port the app runs on
EXPOSE 3000

# 7. Define the command to run your app
CMD ["npm", "start"]

