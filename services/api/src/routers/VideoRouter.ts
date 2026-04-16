import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { VideoController } from '../controllers/VideoController';
import { UpdateStatusSchema } from '../controllers/VideoController';
import type { VideoRepository } from '../repositories/VideoRepository';
import { PubSubAdapter } from '../adapters/PubSubAdapter';

export function createVideoRouter(videoController: VideoController, videoRepo: VideoRepository, pubSubAdapter?: PubSubAdapter) {
  const router = new Hono();

  // 1. Direct Multipart Form Upload
  router.post('/upload', async (c) => {
    const body = await c.req.parseBody();
    const file = body['video'] as File | undefined;
    
    if (!file) {
      return c.json({ error: 'No video file provided' }, 400);
    }
    
    try {
      const result = await videoController.uploadFile(file);
      return c.json(result, 201);
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  router.get('/', async (c) => {
    const videos = await videoRepo.getAllVideos();
    return c.json(videos);
  });

  // 2. Webhook/Callback for Rust Workers
  router.post('/:id/status', zValidator('json', UpdateStatusSchema), async (c) => {
    const id = c.req.param('id');
    const { status, details } = c.req.valid('json');
    await videoRepo.updateStatus(id, status, details);

    if (status === 'PACKAGED' && pubSubAdapter) {
        const video = await videoRepo.getVideo(id);
        if (video) {
            const diskPath = video.gcs_path.replace('file://', '');
            const metadata: any = video.metadata || {};
            const targetResolutions = metadata.target_resolutions || [1080];
            await pubSubAdapter.publishEvent('thumbnail_task', { videoId: id, diskPath, targetResolutions });
        }
    }

    return c.json({ success: true });
  });

  // 3. Fetch specific video status
  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const video = await videoRepo.getVideo(id);
    if (!video) return c.json({ error: 'Not found' }, 404);

    // Deadman switch / Timeout automatic recovery
    const STALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    try {
      const timeSinceUpdate = Date.now() - new Date(video.updated_at as string | Date).getTime();
      
      if (timeSinceUpdate > STALL_TIMEOUT_MS) {
        if (['UPLOADED', 'ANALYZING', 'TRANSCODING', 'ERROR'].includes(video.status)) {
            if (pubSubAdapter) {
                console.log(`[Recovery] Video ${id} natively stalled in ${video.status}. Re-emitting video_uploaded.`);
                const diskPath = video.gcs_path.replace('file://', '');
                await pubSubAdapter.publishEvent('video_uploaded', { videoId: id, diskPath });
                await videoRepo.updateStatus(id, 'UPLOADED', 'Auto-recovered stalled transcode via Polling');
                video.status = 'UPLOADED' as any;
            }
        } else if (['TRANSCODED', 'PACKAGING'].includes(video.status)) {
            if (pubSubAdapter) {
                console.log(`[Recovery] Video ${id} natively stalled in ${video.status}. Re-emitting package_task.`);
                await pubSubAdapter.publishEvent('package_task', { videoId: id });
                await videoRepo.updateStatus(id, 'TRANSCODED', 'Auto-recovered stalled Packager via Polling');
                video.status = 'TRANSCODED' as any;
            }
        } else if (video.status === 'PACKAGED') {
            if (pubSubAdapter) {
                console.log(`[Recovery] Video ${id} natively stalled in PACKAGED. Re-emitting thumbnail_task.`);
                const diskPath = video.gcs_path.replace('file://', '');
                const metadata: any = video.metadata || {};
                const targetResolutions = metadata.target_resolutions || [1080];
                await pubSubAdapter.publishEvent('thumbnail_task', { videoId: id, diskPath, targetResolutions });
            }
        }
      }
    } catch (e) {
      console.error("[Recovery] Validation block failed natively:", e);
    }

    return c.json(video);
  });

  // 4. Register Rendition Targets
  router.post('/:id/rendition-targets', async (c) => {
    const id = c.req.param('id');
    const { targets } = await c.req.json();
    await videoRepo.setRenditionTargets(id, targets);
    return c.json({ success: true });
  });

  // 5. Mark Rendition Complete
  router.post('/:id/rendition-complete', async (c) => {
    const id = c.req.param('id');
    const { resolution } = await c.req.json();
    
    const isFullyComplete = await videoRepo.markRenditionComplete(id, resolution);
    if (isFullyComplete) {
        await videoRepo.updateStatus(id, 'TRANSCODED', 'All renditions generated');
        if (pubSubAdapter) {
            await pubSubAdapter.publishEvent('package_task', { videoId: id });
        }
    }
    
    return c.json({ success: true, isFullyComplete });
  });

  // 6. Store DRM keys for a video (called by packager)
  router.post('/:id/drm-keys', async (c) => {
    const id = c.req.param('id');
    const { keyId, key } = await c.req.json();
    
    const video = await videoRepo.getVideo(id);
    if (!video) return c.json({ error: 'Not found' }, 404);

    const md: any = video.metadata || {};
    md.drm_key_id = keyId;
    md.drm_key = key;

    await videoRepo.updateMetadata(id, md);
    console.log(`Stored DRM keys for video ${id}`);
    return c.json({ success: true });
  });

  // 7. Get DRM keys for a video (called by frontend player)
  router.get('/:id/drm-keys', async (c) => {
    const id = c.req.param('id');
    const video = await videoRepo.getVideo(id);
    if (!video) return c.json({ error: 'Not found' }, 404);

    const md: any = video.metadata || {};
    if (!md.drm_key_id || !md.drm_key) {
      return c.json({ error: 'No DRM keys found' }, 404);
    }

    // Convert hex keys to base64url (what dash.js clearkeys expects)
    const hexToBase64Url = (hex: string): string => {
      const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
      const base64 = btoa(String.fromCharCode(...bytes));
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };

    return c.json({
      keyId: hexToBase64Url(md.drm_key_id),
      key: hexToBase64Url(md.drm_key),
    });
  });

  // 8. Store video metadata (called by analyzer service)
  router.post('/:id/metadata', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const video = await videoRepo.getVideo(id);
    if (!video) return c.json({ error: 'Not found' }, 404);

    const existing: any = video.metadata || {};
    await videoRepo.updateMetadata(id, { ...existing, ...body });
    console.log(`Stored metadata for video ${id}`);
    return c.json({ success: true });
  });

  return router;
}
