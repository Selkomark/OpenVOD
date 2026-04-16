import fs from 'fs/promises';
import path from 'path';

export class StorageAdapter {
  constructor(
    private readonly storageRoot: string
  ) {}

  /**
   * Initializes the storage adapter and creates the root directory if missing.
   */
  async ensureDirectory() {
    await fs.mkdir(this.storageRoot, { recursive: true });
  }

  /**
   * Writes the file buffer to the local disk, ensuring nested paths exist.
   */
  async saveFile(filename: string, data: ArrayBuffer | Buffer): Promise<string> {
    const filePath = path.join(this.storageRoot, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, Buffer.from(data));
    return filePath;
  }
}
