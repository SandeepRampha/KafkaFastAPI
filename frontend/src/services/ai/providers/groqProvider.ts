// TODO: Move AI calls to backend service layer for production
// TODO: Secure API key via backend (AWS Secrets Manager / IAM)

import type { AIResponse, AIContext } from "../aiServiceProvider";
import { ask as mockAsk } from "./mockProvider";

// Groq uses an OpenAI-compatible API
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function ask(prompt: string, context?: AIContext): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_AI_API_KEY;

  if (!apiKey) {
    console.warn("[GroqProvider] No API key found, falling back to mock.");
    return mockAsk(prompt, context);
  }

  let systemMsg = "You are a Kafka Management Assistant for an enterprise dashboard called KafkaManagerUI. You help administrators and users manage Kafka topics, ACLs, consumer groups, and data governance policies. Keep responses concise and actionable (2-4 sentences max). Always provide practical Kafka advice.";
  if (context?.role) systemMsg += ` The user's role is: ${context.role}.`;
  if (context?.page) systemMsg += ` They are currently viewing: ${context.page}.`;
  if (context?.topic) systemMsg += ` They are asking about topic: ${context.topic}.`;

  try {
    console.log(`[GroqProvider] Calling ${MODEL}...`);
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[GroqProvider] API returned ${response.status}: ${errorBody.slice(0, 300)}`);
      throw new Error(`Groq API ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) throw new Error("Empty response from Groq");

    console.log("[GroqProvider] Success!");
    return {
      answer: text,
      suggestions: ["Tell me more", "Best practices", "How to configure"],
      provider: `groq (${MODEL})`
    };
  } catch (error) {
    console.error("[GroqProvider] Failed, falling back to mock:", error);
    const fallback = await mockAsk(prompt, context);
    return {
      ...fallback,
      answer: "⚠️ Groq AI service unavailable, showing best possible answer.\n\n" + fallback.answer,
      provider: "mock (fallback)"
    };
  }
}
