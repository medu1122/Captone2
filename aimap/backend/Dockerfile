# AIMAP Backend – production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY . .

EXPOSE 4000

ENV NODE_ENV=production
CMD ["node", "index.js"]
