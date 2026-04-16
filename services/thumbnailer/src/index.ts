import { ApiClient } from './adapters/ApiClient';
import { PubSubClient } from './adapters/PubSubClient';
import { FFmpegAdapter } from './adapters/FFmpegAdapter';
import { ThumbnailWorkerService } from './services/ThumbnailWorkerService';

const PUB_SUB_ENDPOINT = process.env.PUBSUB_EMULATOR_HOST || 'pubsub-emulator:8085';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'local-vod-project';
const API_URL = process.env.API_URL || 'http://api:3000/api/videos';

console.log('Thumbnail Node Layer starting up...');

const apiClient = new ApiClient(API_URL);
const pubSubClient = new PubSubClient(PUB_SUB_ENDPOINT, PROJECT_ID);
const ffmpegAdapter = new FFmpegAdapter();

const worker = new ThumbnailWorkerService(pubSubClient, apiClient, ffmpegAdapter);
await worker.start();
