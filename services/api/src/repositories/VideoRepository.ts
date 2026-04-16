import type { Kysely } from 'kysely'
import type { Database, VideoStatus } from '../db/types'

export interface CreateVideoDTO {
  filename: string;
  gcs_path: string;
  size_bytes: string;
  metadata: Record<string, string>;
  resolution?: string;
}

export class VideoRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async createVideo(dto: CreateVideoDTO) {
    return this.db
      .insertInto('videos')
      .values({
        filename: dto.filename,
        gcs_path: dto.gcs_path,
        size_bytes: dto.size_bytes,
        resolution: dto.resolution,
        metadata: dto.metadata,
        status: 'UPLOADED',
      })
      .returning(['id', 'filename', 'status'])
      .executeTakeFirstOrThrow()
  }

  async updateStatus(id: string, status: VideoStatus, details?: string) {
    // We update the video and insert a history record in one transaction
    return this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('videos')
        .set({ status, updated_at: new Date() })
        .where('id', '=', id)
        .execute()

      await trx
        .insertInto('pipeline_history')
        .values({
          video_id: id,
          status,
          details
        })
        .execute()
    })
  }

  async setRenditionTargets(id: string, targets: number[]) {
    // We update metadata with empty completed array and targets
    const video = await this.getVideo(id)
    const md = video?.metadata || {}
    md.target_resolutions = targets
    md.completed_resolutions = []
    
    return this.db.updateTable('videos')
      .set({ metadata: md as any })
      .where('id', '=', id)
      .execute()
  }

  async markRenditionComplete(id: string, resolution: number): Promise<boolean> {
    return this.db.transaction().execute(async (trx) => {
      const video = await trx
        .selectFrom('videos')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst()

      if (!video) return false
      
      const md = video.metadata as any
      if (!md.completed_resolutions) md.completed_resolutions = []
      
      if (!md.completed_resolutions.includes(resolution)) {
          md.completed_resolutions.push(resolution)
      }

      await trx.updateTable('videos')
        .set({ metadata: md })
        .where('id', '=', id)
        .execute()
        
      // Check if targets matches completed
      const targets = md.target_resolutions || []
      return targets.length > 0 && targets.every((t: number) => md.completed_resolutions.includes(t))
    });
  }

  async getVideo(id: string) {
    return this.db
      .selectFrom('videos')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
  }

  async getAllVideos() {
    return this.db
      .selectFrom('videos')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute()
  }

  async updateMetadata(id: string, metadata: Record<string, any>) {
    return this.db.updateTable('videos')
      .set({ metadata: metadata as any, updated_at: new Date() })
      .where('id', '=', id)
      .execute()
  }

  async updateGcsPath(id: string, gcsPath: string) {
    return this.db.updateTable('videos')
      .set({ gcs_path: gcsPath, updated_at: new Date() })
      .where('id', '=', id)
      .execute()
  }
}
