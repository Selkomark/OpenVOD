import { ApiClient } from '../adapters/ApiClient';
import { PubSubClient } from '../adapters/PubSubClient';
import { FFmpegAdapter } from '../adapters/FFmpegAdapter';
import path from 'path';
import fs from 'fs/promises';

export class TranscoderWorkerService {
  constructor(
    private apiClient: ApiClient,
    private pubSubClient: PubSubClient,
    private ffmpegAdapter: FFmpegAdapter,
    private storageRootPath: string
  ) {}

  async start(): Promise<void> {
    console.log('Starting Parallel Worker loop...');
    const subscription = await this.pubSubClient.ensureTopicAndSub('transcode_task', 'transcoder_worker_sub');

    subscription.on('message', async (message) => {
      const payload = JSON.parse(message.data.toString());
      console.log(`Worker executing -> ${payload.resolution}p for video ${payload.videoId}`);
      
      message.ack();

      try {
        const outputDir = path.join(this.storageRootPath, 'transcoded', payload.videoId);
        await fs.mkdir(outputDir, { recursive: true });
        // Force output to .mp4 container for Shaka-packager compatibility
        const outputPath = path.join(outputDir, `${payload.resolution}p.mp4`);

        await this.ffmpegAdapter.transcodeVideo(payload.diskPath, outputPath, payload.resolution);
        console.log(`Successfully transcoded ${payload.resolution}p`);

        await this.apiClient.postRenditionComplete(payload.videoId, payload.resolution);
      } catch (err: any) {
        console.error(`Failed to transcode ${payload.resolution}p`, err);
        await this.apiClient.updateStatus(payload.videoId, 'ERROR', `Failed on ${payload.resolution}p: ${err.message}`);
      }
    });
  }
}
