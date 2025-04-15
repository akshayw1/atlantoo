FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code (or use volumes in docker-compose for live reload)
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]