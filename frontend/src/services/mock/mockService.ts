export interface DQRule {
    id: string;
    name: string;
    type: "Null Check" | "Range" | "Format";
    status: "Active" | "Inactive";
    topic: string;
}

export interface TopicMetadata {
    topicName: string;
    owner: string;
    environment: "Dev" | "Staging" | "Prod";
    sensitivity: "Public" | "Internal" | "PII";
}

class MockService {
    private dqRules: DQRule[] = [
        { id: "1", name: "Topic name format validation", type: "Format", status: "Active", topic: "all" },
        { id: "2", name: "Retention limit check", type: "Range", status: "Inactive", topic: "user-activity" },
        { id: "3", name: "User email null check", type: "Null Check", status: "Active", topic: "user-signup" },
    ];

    private metadata: Record<string, TopicMetadata> = {
        "user-activity": { topicName: "user-activity", owner: "Data Team", environment: "Prod", sensitivity: "PII" },
    };

    getDQRules(): Promise<DQRule[]> {
        return new Promise((resolve) => setTimeout(() => resolve(this.dqRules), 800));
    }

    addDQRule(rule: Omit<DQRule, "id">): Promise<DQRule> {
        return new Promise((resolve) => {
            const newRule = { ...rule, id: Math.random().toString(36).substr(2, 9) };
            this.dqRules.push(newRule);
            setTimeout(() => resolve(newRule), 500);
        });
    }

    toggleDQRule(id: string): Promise<void> {
        return new Promise((resolve) => {
            this.dqRules = this.dqRules.map(r => r.id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r);
            setTimeout(resolve, 300);
        });
    }

    getTopicMetadata(topicName: string): Promise<TopicMetadata | null> {
        return new Promise((resolve) => resolve(this.metadata[topicName] || {
            topicName,
            owner: "Unassigned",
            environment: "Dev",
            sensitivity: "Internal"
        }));
    }

    updateTopicMetadata(data: TopicMetadata): Promise<void> {
        return new Promise((resolve) => {
            this.metadata[data.topicName] = data;
            setTimeout(resolve, 500);
        });
    }
}

export const mockService = new MockService();
