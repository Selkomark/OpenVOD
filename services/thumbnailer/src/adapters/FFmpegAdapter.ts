import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FFmpegAdapter {
  async getVideoHeight(videoPath: string): Promise<number> {
    try {
      // Pull both width and height to accurately resolve vertical/horizontal container sizes
      const { stdout } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`);
      const dims = stdout.trim().split('x');
      const width = parseInt(dims[0], 10);
      const height = parseInt(dims[1], 10);
      
      // Standard resolution scale "p" aligns with the shortest dimension natively
      if (!isNaN(width) && !isNaN(height)) {
         return Math.min(width, height);
      }
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
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
    });
  }

  async extractThumbnailSequence(diskPath: string, outputDir: string, resolution: number, durationSecs: number, frameCount: number): Promise<void> {
    const { stdout } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${diskPath}"`);
    const dims = stdout.trim().split('x');
    const width = parseInt(dims[0], 10) || 1920;
    const height = parseInt(dims[1], 10) || 1080;
    const isHorizontal = width >= height;

    const scaleArgs = isHorizontal ? `scale=-2:${resolution}` : `scale=${resolution}:-2`;

    return new Promise((resolve, reject) => {
      // Calculate fraction per second safely
      const fps = frameCount / durationSecs;
      
      const ffmpeg = spawn('ffmpeg', [
        '-i', diskPath,
        '-t', durationSecs.toString(),
        '-vf', `fps=${fps},${scaleArgs}`,
        '-vframes', frameCount.toString(),
        '-q:v', '2',
        '-y',
        `${outputDir}/%02d.jpeg`
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg sequence scaled generation exited with code ${code}`));
      });
    });
  }
}
