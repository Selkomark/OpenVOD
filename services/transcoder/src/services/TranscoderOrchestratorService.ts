import { ApiClient } from '../adapters/ApiClient';
import { PubSubClient } from '../adapters/PubSubClient';
import { FFmpegAdapter } from '../adapters/FFmpegAdapter';

export class TranscoderOrchestratorService {
  constructor(
    private apiClient: ApiClient,
    private pubSubClient: PubSubClient,
    private ffmpegAdapter: FFmpegAdapter
  ) {}

  async start(): Promise<void> {
    console.log('Starting Orchestrator loop...');
    const subscription = await this.pubSubClient.ensureTopicAndSub('video_analyzed', 'transcoder_orchestrator_sub');
    const taskTopic = this.pubSubClient.getTopic('transcode_task');

    subscription.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.data.toString());
        console.log(`Orchestrating video: ${payload.videoId}`);

        await this.apiClient.updateStatus(payload.videoId, 'TRANSCODING');

        const originalHeight = await this.ffmpegAdapter.getVideoHeight(payload.diskPath);
        const standardResolutions = [2160, 1440, 1080, 720, 480, 360, 240, 144];
        const targets = standardResolutions.filter(r => r <= originalHeight);
        console.log(`[Orchestrator] Source height=${originalHeight}, targets=${JSON.stringify(targets)}`);

        await this.apiClient.postRenditionTargets(payload.videoId, targets);

        for (const res of targets) {
          const taskPayload = {
            videoId: payload.videoId,
            diskPath: payload.diskPath,
            resolution: res
          };
          await taskTopic.publishMessage({ data: Buffer.from(JSON.stringify(taskPayload)) });
          console.log(`Scattered Transcode Task -> ${res}p`);
        }

        message.ack();
      } catch (err) {
        console.error('Orchestrator error Processing message:', err);
        message.nack();
      }
    });
  }
}
