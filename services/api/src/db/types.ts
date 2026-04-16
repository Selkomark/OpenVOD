import { Generated, JSONColumnType } from 'kysely'

export interface Database {
  videos: VideosTable;
  pipeline_history: PipelineHistoryTable;
}

export type VideoStatus = 'UPLOADED' | 'ANALYZING' | 'TRANSCODING' | 'TRANSCODED' | 'PACKAGING' | 'PACKAGED' | 'THUMBNAILING' | 'READY_TO_PUBLISH' | 'PUBLISHED'

export interface VideosTable {
  id: Generated<string>;
  filename: string;
  gcs_path: string;
  size_bytes: string;
  resolution: string | null;
  metadata: JSONColumnType<Record<string, string>>;
  status: VideoStatus;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PipelineHistoryTable {
  id: Generated<string>;
  video_id: string;
  status: VideoStatus;
  timestamp: Generated<Date>;
  details: string | null;
}
