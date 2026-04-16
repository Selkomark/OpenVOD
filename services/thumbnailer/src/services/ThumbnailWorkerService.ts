import fs from 'fs/promises';
import path from 'path';
import { PubSubClient } from '../adapters/PubSubClient';
import { ApiClient } from '../adapters/ApiClient';
import { FFmpegAdapter } from '../adapters/FFmpegAdapter';

export class ThumbnailWorkerService {
  constructor(
    private pubSubClient: PubSubClient,
    private apiClient: ApiClient,
    private ffmpegAdapter: FFmpegAdapter
  ) {}

  async start(): Promise<void> {
    console.log('Starting Dedicated Thumbnail Worker loop...');
    const subscription = await this.pubSubClient.ensureTopicAndSub('thumbnail_task', 'thumbnail_worker_sub');

    subscription.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.data.toString());
        const { videoId, diskPath, targetResolutions = [1080] } = payload;
        
        console.log(`Generating sequential thumbnails for video: ${videoId}`);
        await this.apiClient.updateStatus(videoId, 'THUMBNAILING');

        const duration = await this.ffmpegAdapter.getVideoDuration(diskPath);
        
        if (duration <= 0) {
           throw new Error("Invalid duration. Cannot calculate fractional thumbnails!");
        }

        // We target extracting 20 frames purely from the first 30% of the video duration
        const targetDuration = duration * 0.3;

        // Iterate through all target tracking resolutions and explicitly scaffold identical directory patterns
        for (const res of targetResolutions) {
            const thumbnailDir = path.join('/app/storage/thumbnails', videoId, `${res}p`);
            await fs.mkdir(thumbnailDir, { recursive: true });

            // Natively delegate the seqential mapping operation correctly into ffmpeg mapping vertical tracking explicitly
            await this.ffmpegAdapter.extractThumbnailSequence(diskPath, thumbnailDir, res, targetDuration, 20);
            console.log(`Generated explicit sequence successfully for natively targeted format: ${res}p`);
        }

        console.log(`Successfully completed global thumbnail extraction array dynamically for: ${videoId}`);

        // Broadcast final PUBLISHED status
        await this.apiClient.updateStatus(videoId, 'PUBLISHED');

        message.ack();
      } catch (err: any) {
        console.error('Thumbnail generation failed!', err);
        message.nack();
      }
    });
  }
}
