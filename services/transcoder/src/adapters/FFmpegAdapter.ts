import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FFmpegAdapter {
  async getVideoHeight(videoPath: string): Promise<number> {
    try {
      // Pull both width and height to accurately resolve vertical/horizontal container sizes
      const { stdout } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`);
      const raw = stdout.trim();
      const dims = raw.split('x');
      const width = parseInt(dims[0], 10);
      const height = parseInt(dims[1], 10);
      
      // Standard resolution scale "p" aligns with the shortest dimension natively
      if (!isNaN(width) && !isNaN(height)) {
         const result = Math.min(width, height);
         console.log(`[ffprobe] ${videoPath} -> raw="${raw}" width=${width} height=${height} -> resolved=${result}`);
         return result;
      }
      console.log(`[ffprobe] ${videoPath} -> raw="${raw}" PARSE FAILED, defaulting to 1080`);
      return 1080;
    } catch (err) {
      console.error('ffprobe metadata failed:', err);
      return 1080;
    }
  }

  async getVideoDuration(videoPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`);
      return parseFloat(stdout.trim()) || 0;
    } catch (err) {
      console.error('ffprobe duration failed:', err);
      return 0;
    }
  }

  async transcodeVideo(diskPath: string, outputPath: string, resolution: number): Promise<void> {
    const { stdout } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${diskPath}"`);
    const dims = stdout.trim().split('x');
    const width = parseInt(dims[0], 10) || 1920;
    const height = parseInt(dims[1], 10) || 1080;
    const isHorizontal = width >= height;
    
    // Bind resolution against the shortest core dimension cleanly dynamically preserving AR
    const vfScale = isHorizontal ? `scale=-2:${resolution}` : `scale=${resolution}:-2`;

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i', diskPath,
        '-vf', vfScale,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-c:a', 'aac',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
  }

  extractThumbnail(diskPath: string, outputPath: string, timestamp: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Calculate HH:MM:SS.mmm formatted timestamp
      const s = timestamp % 60;
      const m = Math.floor(timestamp / 60) % 60;
      const h = Math.floor(timestamp / 3600);
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
      
      const ffmpeg = spawn('ffmpeg', [
        '-ss', timeStr,
        '-i', diskPath,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
  }
}
