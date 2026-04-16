export interface VideoData {
  id: string;
  filename: string;
  gcs_path: string;
  size_bytes: string;
  status: 'UPLOADED' | 'ANALYZING' | 'TRANSCODING' | 'TRANSCODED' | 'PACKAGING' | 'PACKAGED' | 'THUMBNAILING' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ERROR';
  details?: string;
  metadata?: {
    target_resolutions?: number[];
    width?: number;
    height?: number;
    duration?: number;
    resolution_label?: string;
  };
  created_at: string;
  updated_at: string;
}

const API_BASE = '/api/videos';

export async function uploadDirectly(file: File, onProgress: (pct: number) => void) {
  return new Promise<VideoData>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('video', file, file.name);

    xhr.open('POST', `${API_BASE}/upload`, true);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error || `Upload failed with status ${xhr.status}`));
        } catch(e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('Upload network error. Is the API reachable?'));
    xhr.send(formData);
  });
}

export async function pollVideoStatus(id: string) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json() as Promise<VideoData>;
}

export async function fetchAllVideos() {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch video list');
  return res.json() as Promise<VideoData[]>;
}
