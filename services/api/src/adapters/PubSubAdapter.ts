import { PubSub } from '@google-cloud/pubsub';

export class PubSubAdapter {
  constructor(private readonly pubSubClient: PubSub) {}

  private initializedTopics: Set<string> = new Set();

  async initializeClusterTopics() {
    const defaultTopics = [
        'video_uploaded', 'video_analyzed', 'transcode_task', 'package_task', 'thumbnail_task',
        'video_uploaded_dlq', 'transcode_task_dlq', 'package_task_dlq'
    ];
    for (const t of defaultTopics) {
      const topic = this.pubSubClient.topic(t);
      const [exists] = await topic.exists();
      if (!exists) {
        try {
          console.log(`[API] Provisioning cluster topic: ${t}`);
          await topic.create();
        } catch (err: any) {
          if (err?.code !== 6) throw err; // 6 = ALREADY_EXISTS
        }
      }
      this.initializedTopics.add(t);
    }
  }

  /**
   * Publishes a JSON payload-based event to a specific topic.
   */
  async publishEvent(topicName: string, payload: Record<string, unknown>): Promise<string> {
    const topic = this.pubSubClient.topic(topicName);
    
    // Ensure the topic exists in the emulator
    if (!this.initializedTopics.has(topicName)) {
      const [exists] = await topic.exists();
      if (!exists) {
        await topic.create();
      }
      this.initializedTopics.add(topicName);
    }

    const dataBuffer = Buffer.from(JSON.stringify(payload));
    
    // Publish message and return message ID
    const messageId = await topic.publishMessage({ data: dataBuffer });
      
    return messageId;
  }
}
