FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      ffmpeg \
      ca-certificates \
      git \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --break-system-packages -U yt-dlp

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
ENV YTDLP_BIN=python3
ENV MEDIAFLOW_JS_RUNTIME=node

RUN npm run build

CMD ["node", ".output/server/index.mjs"]
