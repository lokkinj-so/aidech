# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p credentials data

# Set environment
ENV NODE_ENV=production

# Run the application
CMD ["npm", "start"]
