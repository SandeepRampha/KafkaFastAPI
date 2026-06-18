// TODO: Replace mock provider with Cloudera CAI integration
// TODO: Add RAG support for document-based querying

import type { AIResponse, AIContext } from "../aiServiceProvider";

const responses: Record<string, string> = {
  lag: "Kafka consumer lag represents the difference between the latest offset produced and the last offset processed by a consumer group. High lag typically indicates consumers cannot keep up with production volume. Monitor lag using Consumer Group commands or JMX metrics.",
  retention: "Retention is controlled by 'retention.ms' (time-based) or 'retention.bytes' (size-based). For high-throughput topics, consider shorter retention or compacted cleanup policy. Default is 7 days (604800000ms).",
  acl: "Access Control Lists (ACLs) manage permissions for principals (users/groups). Common operations: READ, WRITE, DESCRIBE, CREATE, DELETE. Use LITERAL pattern for specific resources or PREFIXED for naming conventions. Always follow the principle of least privilege.",
  partition: "Partitions are the fundamental unit of parallelism in Kafka. More partitions = higher throughput, but also more file handles and rebalancing overhead. A good starting point is 3-6 partitions per topic for moderate workloads.",
  topic: "Topics are the primary abstraction in Kafka. Key configurations include partition count, replication factor, cleanup policy, and retention settings. Use meaningful naming conventions like '<domain>.<event>.<version>'.",
  replication: "Replication factor determines how many copies of data exist across brokers. A factor of 3 is standard for production. Combined with min.insync.replicas=2, this ensures durability even if one broker fails.",
  dq: "Data Quality (DQ) rules verify that topic data matches expected formats, ranges, and null constraints. Our governance layer allows Data Stewards to enforce rules without modifying broker configurations.",
  consumer: "Consumer groups enable parallel consumption of topic partitions. Each partition is consumed by exactly one consumer in a group. Use group.id for coordination and enable auto-commit or manual offset management.",
  producer: "Producers publish records to topics. Key settings: acks (0, 1, all), batch.size, linger.ms, and compression.type. Use 'acks=all' for maximum durability in production environments.",
  broker: "Brokers are Kafka server instances that store data and serve clients. A cluster typically has 3+ brokers. Key metrics to monitor: disk I/O, network throughput, request latency, and under-replicated partitions."
};

function getContextPrefix(context?: AIContext): string {
  if (!context) return "";
  const parts: string[] = [];
  if (context.role === "admin") parts.push("As an administrator");
  if (context.role === "data_steward") parts.push("From a governance perspective");
  if (context.page) parts.push(`(viewing ${context.page})`);
  if (context.topic) parts.push(`regarding topic '${context.topic}'`);
  return parts.length > 0 ? parts.join(" ") + ": " : "";
}

export async function ask(prompt: string, context?: AIContext): Promise<AIResponse> {
  // Simulate network delay for realism
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600));

  const lowerPrompt = prompt.toLowerCase();
  const prefix = getContextPrefix(context);

  for (const [key, val] of Object.entries(responses)) {
    if (lowerPrompt.includes(key)) {
      return {
        answer: prefix + val,
        suggestions: [`Best practices for ${key}`, `How to configure ${key}`, `${key} troubleshooting`],
        provider: "mock"
      };
    }
  }

  return {
    answer: prefix + "I'm your Kafka Management Assistant. I can help with topics, ACLs, partitions, retention, consumer groups, replication, and data quality. Try asking about any of these!",
    suggestions: ["Tell me about lag", "Explain ACLs", "What is retention?", "List active topics"],
    provider: "mock"
  };
}
