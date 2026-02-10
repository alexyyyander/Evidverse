# Dockerfile for Next.js Frontend

FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build (optional for dev, required for prod)
# RUN npm run build

# Run command
CMD ["npm", "run", "dev"]
