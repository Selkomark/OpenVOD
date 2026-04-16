FROM oven/bun:1

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root lockfiles for caching
COPY package.json bun.lockb* ./
COPY services/thumbnailer/package.json ./services/thumbnailer/

RUN bun install

# Copy service code
WORKDIR /app/services/thumbnailer
COPY services/thumbnailer/ .

# Run the transcoder node natively natively under watch bounds
CMD ["bun", "--watch", "src/index.ts"]
