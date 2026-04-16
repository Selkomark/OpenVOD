import { PubSub, Subscription } from '@google-cloud/pubsub';

export class PubSubClient {
  private pubsub: PubSub;
  private projectId: string;

  constructor(apiEndpoint: string, projectId: string) {
    this.projectId = projectId;
    this.pubsub = new PubSub({
      apiEndpoint,
      projectId,
    });
  }

  async ensureTopicAndSub(topicName: string, subName: string): Promise<Subscription> {
    const topic = this.pubsub.topic(topicName);
    const [topicExists] = await topic.exists();
    if (!topicExists) {
      console.log(`Topic '${topicName}' missing, creating it...`);
      await topic.create();
    }

    const dlqTopicName = `${topicName}_dlq`;
    const dlqTopic = this.pubsub.topic(dlqTopicName);
    const [dlqExists] = await dlqTopic.exists();
    if (!dlqExists) {
      console.log(`DLQ Topic '${dlqTopicName}' missing, creating it...`);
      await dlqTopic.create();
    }

    const fqDlqTopic = `projects/${this.projectId}/topics/${dlqTopicName}`;
    const subscription = this.pubsub.subscription(subName);
    const [subExists] = await subscription.exists();
    if (!subExists) {
      console.log(`Enforcing subscription '${subName}' onto '${topicName}'...`);
      await this.pubsub.createSubscription(topicName, subName, {
        deadLetterPolicy: {
          deadLetterTopic: fqDlqTopic,
          maxDeliveryAttempts: 5,
        }
      });
      console.log(`Subscription '${subName}' created successfully.`);
    } else {
      console.log(`Subscription '${subName}' already exists.`);
    }

    return this.pubsub.subscription(subName);
  }
}
