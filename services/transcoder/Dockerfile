FROM oven/bun:1

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lockb* ./
COPY services/transcoder/package.json ./services/transcoder/

RUN bun install

WORKDIR /app/services/transcoder

CMD ["bun", "run", "dev"]
