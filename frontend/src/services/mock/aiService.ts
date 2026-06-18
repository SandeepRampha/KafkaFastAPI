export interface AIResponse {
    answer: string;
    suggestions: string[];
}

class AIService {
    private responses: Record<string, string> = {
        "lag": "Kafka consumer lag represents the difference between the latest offset produced and the last offset processed. High lag typically indicates that your consumers belong to a consumer group that cannot keep up with the volume of data being produced.",
        "retention": "Retention is controlled by 'retention.ms' (the time messages are kept) or 'retention.bytes' (the volume of data kept). For high-throughput topics, consider a shorter retention period or compacted cleanup policy to save disk space.",
        "acl": "Access Control Lists (ACLs) in Kafka manage permissions for principals. Common operations include READ, WRITE, and DESCRIBE. It is recommended to use the 'LITERAL' pattern for specific topics or 'PREFIXED' for consumer group naming conventions.",
        "partition": "Partitions are the fundamental unit of parallelism in Kafka. Increasing partition count allows for higher throughput but can also increase file handle usage and overhead during broker rebalances.",
        "dq": "Data Quality (DQ) rules verify that the data in your topics matches expected formats, ranges, and null constraints. Our DQ layer allows Data Stewards to monitor and enforce these rules without modifying broker configurations."
    };

    async getResponse(prompt: string): Promise<AIResponse> {
        await new Promise((resolve) => setTimeout(resolve, 1200));

        const lowerPrompt = prompt.toLowerCase();
        let answer = "I'm sorry, I don't have specific information on that topic currently. Try asking about 'lag', 'retention', 'ACL', 'partitions', or 'Data Quality'.";
        let suggestions: string[] = ["Tell me about lag", "Explain ACLs", "What is retention?"];

        for (const [key, val] of Object.entries(this.responses)) {
            if (lowerPrompt.includes(key)) {
                answer = val;
                suggestions = ["Tell me more about " + key, "How to configure " + key, "Best practices for " + key];
                break;
            }
        }

        return { answer, suggestions };
    }
}

export const aiService = new AIService();
