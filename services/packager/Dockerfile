FROM oven/bun:1

WORKDIR /app

RUN apt-get update && apt-get install -y wget python3 python3-pip ffmpeg && rm -rf /var/lib/apt/lists/*
RUN wget https://github.com/shaka-project/shaka-packager/releases/download/v3.0.0/packager-linux-x64 -O /usr/local/bin/packager-shaka && chmod +x /usr/local/bin/packager-shaka

COPY package.json bun.lockb* ./
COPY services/packager/package.json ./services/packager/

RUN bun install

WORKDIR /app/services/packager

CMD ["bun", "run", "dev"]
