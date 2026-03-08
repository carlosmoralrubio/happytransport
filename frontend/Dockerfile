# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/.env .
COPY frontend/src ./src
COPY frontend/index.html .
COPY frontend/vite.config.js .

RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist
COPY frontend/entrypoint.sh .

RUN chmod +x entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["./entrypoint.sh"]
