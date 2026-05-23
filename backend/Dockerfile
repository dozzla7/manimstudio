FROM node:20-alpine

# Install Python for syntax checking
RUN apk add --no-cache python3

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p data temp generations output
# Create initial empty projects.json if it doesn't exist
RUN echo "{}" > data/projects.json

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
