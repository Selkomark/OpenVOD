import { spawn } from 'child_process';

export class ShakaAdapter {
  runPackager(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Evaluating packager graph natively: packager-shaka', args.join(' '));
      const child = spawn('packager-shaka', args);

      let stderr = '';
      child.stdout.on('data', (data) => console.log('[shaka stdout]', data.toString()));
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[shaka stderr]', data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`packager-shaka exited with code ${code}: ${stderr}`));
      });
    });
  }
}
