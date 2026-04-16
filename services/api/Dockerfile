FROM oven/bun:1

WORKDIR /app

# Copy root and service package files
COPY package.json bun.lockb* ./
COPY services/api/package.json ./services/api/

RUN bun install


WORKDIR /app/services/api
EXPOSE 3000

CMD ["bun", "run", "dev"]
