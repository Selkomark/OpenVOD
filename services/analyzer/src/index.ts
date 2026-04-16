import { ApiClient } from './adapters/ApiClient';
import { PubSubClient } from './adapters/PubSubClient';
import { AnalyzerWorkerService } from './services/AnalyzerWorkerService';

const PUB_SUB_ENDPOINT = process.env.PUBSUB_EMULATOR_HOST || 'pubsub-emulator:8085';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'local-vod-project';
const API_URL = process.env.API_URL || 'http://api:3000/api/videos';

console.log('Analyzer Node starting up...');

const apiClient = new ApiClient(API_URL);
const pubSubClient = new PubSubClient(PUB_SUB_ENDPOINT, PROJECT_ID);

const worker = new AnalyzerWorkerService(pubSubClient, apiClient);
await worker.start();
