// TODO: Replace mock provider with Cloudera CAI integration
// TODO: Add RAG support for document-based querying
// TODO: Move provider routing to backend for production

export interface AIResponse {
  answer: string;
  suggestions: string[];
  provider: string;
}

export interface AIContext {
  role?: "admin" | "user" | "data_steward";
  page?: string;
  topic?: string;
}

type AIProvider = "gemini" | "openai" | "groq" | "mock";

/**
 * Unified AI service entry point.
 * Routes to the correct provider based on VITE_AI_PROVIDER env var.
 * Falls back to mock if provider is unset or unknown.
 */
export async function askAI(prompt: string, context?: AIContext): Promise<AIResponse> {
  const provider = (import.meta.env.VITE_AI_PROVIDER || "mock") as AIProvider;

  switch (provider) {
    case "gemini": {
      const { ask } = await import("./providers/geminiProvider");
      return ask(prompt, context);
    }
    case "openai": {
      const { ask } = await import("./providers/openaiProvider");
      return ask(prompt, context);
    }
    case "groq": {
      const { ask } = await import("./providers/groqProvider");
      return ask(prompt, context);
    }
    case "mock":
    default: {
      const { ask } = await import("./providers/mockProvider");
      return ask(prompt, context);
    }
  }
}


/** Returns the currently configured provider name */
export function getActiveProvider(): string {
  return import.meta.env.VITE_AI_PROVIDER || "mock";
}
