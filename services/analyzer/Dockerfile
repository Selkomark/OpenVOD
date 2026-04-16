FROM oven/bun:1

# Install FFmpeg (for ffprobe)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root lockfiles for caching
COPY package.json bun.lockb* ./
COPY services/analyzer/package.json ./services/analyzer/

RUN bun install

WORKDIR /app/services/analyzer
COPY services/analyzer/ .

CMD ["bun", "--watch", "src/index.ts"]
