import { ApiClient } from '../adapters/ApiClient';
import { PubSubClient } from '../adapters/PubSubClient';
import { ShakaAdapter } from '../adapters/ShakaAdapter';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export class PackagerWorkerService {
  constructor(
    private apiClient: ApiClient,
    private pubSubClient: PubSubClient,
    private shakaAdapter: ShakaAdapter,
    private storageRootPath: string
  ) {}

  async start(): Promise<void> {
    const subscription = await this.pubSubClient.ensureTopicAndSub('package_task', 'packager_worker_sub');
    console.log(`Starting Packager Worker loop on explicitly: ${subscription.name}...`);

    subscription.on('message', async (message) => {
      let videoId: string | null = null;
      try {
        const payload = JSON.parse(message.data.toString());
        videoId = payload.videoId;
        console.log(`Executing Packaging task for video: ${videoId}`);

        await this.apiClient.updateStatus(videoId!, 'PACKAGING');

        // Artificial delay
        await new Promise(r => setTimeout(r, 2500));

        const inputDir = path.join(this.storageRootPath, 'transcoded', videoId!);
        const outputDir = path.join(this.storageRootPath, 'packaged', videoId!);
        
        await fs.mkdir(outputDir, { recursive: true });

        const files = await fs.readdir(inputDir);
        const mp4Files = files.filter(f => f.endsWith('.mp4'));

        if (mp4Files.length === 0) {
          console.log(`No transcoded MP4 components detected internally for ${videoId}!`);
          await this.apiClient.updateStatus(videoId!, 'ERROR', 'No mp4 chunks provided to wrap natively!');
          message.ack();
          return;
        }

        // Generate unique DRM keys for this video
        const drmKeyId = crypto.randomBytes(16).toString('hex');
        const drmKey = crypto.randomBytes(16).toString('hex');
        console.log(`Generated DRM keys for ${videoId}: keyId=${drmKeyId}`);

        // Store keys in the database via API
        await this.apiClient.storeDrmKeys(videoId!, drmKeyId, drmKey);

        const args: string[] = [];
        for (const file of mp4Files) {
          const filePath = path.join(inputDir, file);
          const stem = path.basename(file, '.mp4');
          args.push(`in=${filePath},stream=video,output=${outputDir}/${stem}.mp4,playlist_name=${stem}.m3u8,drm_label=key1`);
        }

        // Extract audio if the source file has an audio track
        const audioSource = mp4Files.find(f => f.startsWith('1080p')) || mp4Files[0];
        const audioPath = path.join(inputDir, audioSource);
        const hasAudio = await this.probeHasAudio(audioPath);
        if (hasAudio) {
          args.push(`in=${audioPath},stream=audio,output=${outputDir}/audio.mp4,playlist_name=audio.m3u8,drm_label=key1`);
          console.log(`Audio track detected in ${audioSource}, including in package.`);
        } else {
          console.log(`No audio track in ${audioSource}, packaging video-only.`);
        }

        // Output paths 
        args.push('--hls_master_playlist_output', `${outputDir}/master.m3u8`);
        args.push('--mpd_output', `${outputDir}/manifest.mpd`);

        // DRM Settings (per-video unique keys)
        args.push('--enable_raw_key_encryption');
        args.push('--protection_scheme', 'cenc'); 
        args.push('--clear_lead', '0');
        args.push('--keys', `label=key1:key_id=${drmKeyId}:key=${drmKey}`);

        await this.shakaAdapter.runPackager(args);

        console.log(`Successfully packaged dynamically: ${videoId}`);
        await this.apiClient.updateStatus(videoId!, 'PACKAGED');

      } catch (err: any) {
        console.error('Packaging failed!', err);
        if (videoId) {
          await this.apiClient.updateStatus(videoId, 'ERROR', 'Failed during Shaka construction!');
        }
      }
      
      message.ack();
    });

    subscription.on('error', err => {
      console.error('PubSub stream disconnected internally! Error:', err);
    });
  }

  private async probeHasAudio(filePath: string): Promise<boolean> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync(`ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${filePath}"`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}
