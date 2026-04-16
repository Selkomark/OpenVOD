export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async post(path: string, body: any): Promise<void> {
    const url = `${this.baseUrl}${path}`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error(`API callback to ${url} failed:`, err);
    }
  }

  async updateStatus(videoId: string, status: string, details?: string): Promise<void> {
    const payload: any = { status };
    if (details) payload.details = details;
    await this.post(`/${videoId}/status`, payload);
  }

  async postRenditionTargets(videoId: string, targets: number[]): Promise<void> {
    await this.post(`/${videoId}/rendition-targets`, { targets });
  }

  async postRenditionComplete(videoId: string, resolution: number): Promise<void> {
    await this.post(`/${videoId}/rendition-complete`, { resolution });
  }
}
