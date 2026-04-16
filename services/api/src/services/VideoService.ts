import type { VideoRepository } from '../repositories/VideoRepository';
import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { PubSubAdapter } from '../adapters/PubSubAdapter';

export class VideoService {
  constructor(
    private readonly videoRepo: VideoRepository,
    private readonly storageAdapter: StorageAdapter,
    private readonly pubSubAdapter: PubSubAdapter
  ) {}

  /**
   * Accepts a multipart File, writes to disk, database, and fires event
   */
  async uploadFile(file: File) {
    const originalFilename = file.name || 'upload.mp4';
    const extension = originalFilename.split('.').pop() || 'mp4';

    // Create DB row first to get the canonical UUID
    const video = await this.videoRepo.createVideo({
      filename: originalFilename,
      gcs_path: '', // placeholder, updated below
      size_bytes: file.size.toString(),
      metadata: {},
      resolution: undefined
    });

    const storageFilename = `ingest/${video.id}.${extension}`;

    // Ensure directory exists
    await this.storageAdapter.ensureDirectory();
    
    // Read Web API File and write to disk
    const arrayBuffer = await file.arrayBuffer();
    const diskPath = await this.storageAdapter.saveFile(storageFilename, arrayBuffer);

    // Update the DB row with the actual disk path
    await this.videoRepo.updateGcsPath(video.id, `file://${diskPath}`);

    // Queue for metadata analysis (which will then trigger transcoding)
    await this.pubSubAdapter.publishEvent('video_uploaded', {
      videoId: video.id,
      diskPath: diskPath
    });

    return video;
  }
}
