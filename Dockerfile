FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies to keep the image small
RUN npm prune --omit=dev

# Expose the API port
EXPOSE 3000

# Start the built application
CMD ["npm", "start"]
