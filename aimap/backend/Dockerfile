FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/storage
EXPOSE 4111
CMD ["node", "index.js"]
