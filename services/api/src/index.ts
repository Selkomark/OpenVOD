import { Hono } from 'hono';

import { PubSub } from '@google-cloud/pubsub';

import { db } from './db';
import { VideoRepository } from './repositories/VideoRepository';
import { StorageAdapter } from './adapters/StorageAdapter';
import { PubSubAdapter } from './adapters/PubSubAdapter';
import { VideoService } from './services/VideoService';
import { VideoController } from './controllers/VideoController';
import { createVideoRouter } from './routers/VideoRouter';
import path from 'path';

const app = new Hono();
// Removed logger due to bun resolution error
app.get('/storage/*', async (c) => {
  const urlPath = new URL(c.req.url).pathname;
  const file = Bun.file('/app' + urlPath);
  if (await file.exists()) {
    return new Response(file);
  }
  return c.notFound();
});

// Bootstrapping Dependencies
const pubsubClient = new PubSub({ 
  apiEndpoint: process.env.PUBSUB_EMULATOR_HOST || 'pubsub-emulator:8085',
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'local-vod-project',
});
const videoRepo = new VideoRepository(db);

// StorageAdapter now mounts directly to /app/storage internally.
const storageRoot = process.env.STORAGE_ROOT_PATH || '/app/storage';
const storageAdapter = new StorageAdapter(storageRoot);

const pubSubAdapter = new PubSubAdapter(pubsubClient);
await pubSubAdapter.initializeClusterTopics();

const videoService = new VideoService(videoRepo, storageAdapter, pubSubAdapter);
const videoController = new VideoController(videoService);
const videoRouter = createVideoRouter(videoController, videoRepo, pubSubAdapter);

// Mount router
app.route('/api/videos', videoRouter);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default {
  port: 3000,
  idleTimeout: 255, // maximum allowed by Bun
  maxRequestBodySize: 1024 * 1024 * 1024 * 2, // 2GB max upload size
  fetch: app.fetch,
};
