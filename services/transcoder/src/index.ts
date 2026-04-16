import { ApiClient } from './adapters/ApiClient';
import { PubSubClient } from './adapters/PubSubClient';
import { FFmpegAdapter } from './adapters/FFmpegAdapter';
import { TranscoderOrchestratorService } from './services/TranscoderOrchestratorService';
import { TranscoderWorkerService } from './services/TranscoderWorkerService';

const PUBSUB_EMULATOR_HOST = process.env.PUBSUB_EMULATOR_HOST || 'pubsub-emulator:8085';
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'local-vod-project';
const API_BASE_URL = process.env.API_BASE_URL || 'http://api:3000/api/videos';
const STORAGE_ROOT_PATH = process.env.STORAGE_ROOT_PATH || '/app/storage';

async function main() {
  console.log('Transcoder Node (Layered Arch) starting up...');
  await new Promise(r => setTimeout(r, 5000)); // Delay for pubsub emulator startup

  // Initialize adapters
  const apiClient = new ApiClient(API_BASE_URL);
  const pubSubClient = new PubSubClient(PUBSUB_EMULATOR_HOST, GOOGLE_CLOUD_PROJECT);
  const ffmpegAdapter = new FFmpegAdapter();

  // Initialize services
  const orchestratorConfig = new TranscoderOrchestratorService(apiClient, pubSubClient, ffmpegAdapter);
  const workerConfig = new TranscoderWorkerService(apiClient, pubSubClient, ffmpegAdapter, STORAGE_ROOT_PATH);

  // Start listeners
  await orchestratorConfig.start();
  await workerConfig.start();
}

main().catch(console.error);
