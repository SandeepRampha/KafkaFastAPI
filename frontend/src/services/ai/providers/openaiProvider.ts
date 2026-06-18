// TODO: Move AI calls to backend service layer for production
// TODO: Secure API key via backend (AWS Secrets Manager / IAM)

import type { AIResponse, AIContext } from "../aiServiceProvider";
import { ask as mockAsk } from "./mockProvider";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function ask(prompt: string, context?: AIContext): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_AI_API_KEY;

  if (!apiKey) {
    console.warn("[OpenAIProvider] No API key found, falling back to mock.");
    return mockAsk(prompt, context);
  }

  let systemMsg = "You are a Kafka Management Assistant. Keep responses concise (2-4 sentences). Provide practical Kafka advice.";
  if (context?.role) systemMsg += ` User role: ${context.role}.`;
  if (context?.page) systemMsg += ` Current page: ${context.page}.`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
    });

    if (!response.ok) throw new Error(`OpenAI API returned ${response.status}`);

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) throw new Error("Empty response from OpenAI");

    return {
      answer: text,
      suggestions: ["Tell me more", "Best practices", "How to configure"],
      provider: "openai"
    };
  } catch (error) {
    console.error("[OpenAIProvider] API call failed, falling back to mock:", error);
    const fallback = await mockAsk(prompt, context);
    return {
      ...fallback,
      answer: "⚠️ AI service temporarily unavailable, showing best possible answer.\n\n" + fallback.answer,
      provider: "mock (fallback)"
    };
  }
}
