import { exec } from 'child_process';
import { promisify } from 'util';
import type { ApiClient } from '../adapters/ApiClient';
import type { PubSubClient } from '../adapters/PubSubClient';

const execAsync = promisify(exec);

export class AnalyzerWorkerService {
  constructor(
    private pubSubClient: PubSubClient,
    private apiClient: ApiClient
  ) {}

  async start(): Promise<void> {
    const subscription = await this.pubSubClient.ensureTopicAndSub('video_uploaded', 'analyzer_worker_sub');
    const analyzedTopic = this.pubSubClient.getTopic('video_analyzed');

    console.log(`Starting Analyzer Worker loop on: ${subscription.name}...`);

    subscription.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.data.toString());
        const { videoId, diskPath } = payload;
        console.log(`[Analyzer] Analyzing video: ${videoId}`);

        // Set status to ANALYZING
        await this.apiClient.updateStatus(videoId, 'ANALYZING');

        // Probe video dimensions
        const { stdout: dimOut } = await execAsync(
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${diskPath}"`
        );

        // Probe duration
        const { stdout: durOut } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${diskPath}"`
        );

        // Probe codec
        const { stdout: codecOut } = await execAsync(
          `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${diskPath}"`
        );

        // Probe audio presence
        const { stdout: audioOut } = await execAsync(
          `ffprobe -v error -select_streams a -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${diskPath}"`
        ).catch(() => ({ stdout: '' }));

        const dims = dimOut.trim().split('x');
        const width = parseInt(dims[0], 10) || 0;
        const height = parseInt(dims[1], 10) || 0;
        const duration = parseFloat(durOut.trim()) || 0;
        const codec = codecOut.trim() || 'unknown';
        const hasAudio = audioOut.trim().length > 0;
        const audioCodec = audioOut.trim().split('\n')[0] || null;
        const resolution = Math.min(width, height);

        const metadata = {
          width,
          height,
          duration,
          resolution_label: `${resolution}p`,
          codec,
          has_audio: hasAudio,
          audio_codec: audioCodec,
        };

        console.log(`[Analyzer] ${videoId}: ${width}x${height}, ${duration.toFixed(1)}s, codec=${codec}, audio=${hasAudio ? audioCodec : 'none'}`);

        // Store metadata via API
        await this.apiClient.storeMetadata(videoId, metadata);

        // Publish video_analyzed to trigger transcoding
        await analyzedTopic.publishMessage({
          data: Buffer.from(JSON.stringify({ videoId, diskPath }))
        });

        console.log(`[Analyzer] Analysis complete for ${videoId}, published video_analyzed.`);
        message.ack();
      } catch (err) {
        console.error('[Analyzer] Analysis failed:', err);
        message.ack();
      }
    });

    subscription.on('error', (err) => {
      console.error('[Analyzer] Subscription error:', err);
    });
  }
}
