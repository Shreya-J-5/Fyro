FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies & ffmpeg
RUN apk add --no-cache ffmpeg python3 make g++ 

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Install ffmpeg & python3 in runtime container (required for yt-dlp and audio encoding)
RUN apk add --no-cache ffmpeg python3

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
