import { z } from 'zod';
import type { VideoService } from '../services/VideoService';

export const UpdateStatusSchema = z.object({
  status: z.enum(['UPLOADED', 'TRANSCODING', 'TRANSCODED', 'PACKAGING', 'PACKAGED', 'THUMBNAILING', 'READY_TO_PUBLISH', 'PUBLISHED']),
  details: z.string().optional(),
});

export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  async uploadFile(file: File) {
    if (!file) throw new Error('File not provided');
    if (!file.type.startsWith('video/')) throw new Error('Invalid file type');
    return this.videoService.uploadFile(file);
  }
}
