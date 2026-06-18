// TODO: Move AI calls to backend service layer for production
// TODO: Secure API key via backend (AWS Secrets Manager / IAM)

import type { AIResponse, AIContext } from "../aiServiceProvider";
import { ask as mockAsk } from "./mockProvider";

const MODEL = "gemini-2.0-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function buildSystemPrompt(context?: AIContext): string {
  let system = "You are a Kafka Management Assistant for an enterprise dashboard called KafkaManagerUI. You help administrators and users manage Kafka topics, ACLs, consumer groups, and data governance policies. Keep responses concise and actionable (2-4 sentences max). Always provide practical Kafka advice.";
  if (context?.role) system += ` The user's role is: ${context.role}.`;
  if (context?.page) system += ` They are currently viewing: ${context.page}.`;
  if (context?.topic) system += ` They are asking about topic: ${context.topic}.`;
  return system;
}

async function callGemini(apiKey: string, prompt: string, context?: AIContext): Promise<Response> {
  return fetch(`${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystemPrompt(context) }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    })
  });
}

export async function ask(prompt: string, context?: AIContext): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_AI_API_KEY;

  if (!apiKey) {
    console.warn("[GeminiProvider] No API key found, falling back to mock.");
    return mockAsk(prompt, context);
  }

  // Try up to 2 attempts (initial + 1 retry on 429)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      console.log(`[GeminiProvider] Attempt ${attempt + 1} with ${MODEL}`);
      const response = await callGemini(apiKey, prompt, context);

      // Handle rate limiting with retry
      if (response.status === 429 && attempt === 0) {
        const body = await response.json();
        const retryDelay = body?.error?.details?.find(
          (d: Record<string, string>) => d["@type"]?.includes("RetryInfo")
        )?.retryDelay;
        const waitMs = retryDelay ? parseInt(retryDelay) * 1000 : 10000;
        const cappedWait = Math.min(waitMs, 15000); // Cap at 15s
        console.log(`[GeminiProvider] Rate limited. Retrying in ${cappedWait}ms...`);
        await new Promise(r => setTimeout(r, cappedWait));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");

      return {
        answer: text,
        suggestions: ["Tell me more", "Best practices", "How to configure"],
        provider: `gemini`
      };
    } catch (error) {
      if (attempt === 1 || !(error instanceof Error && error.message.includes("429"))) {
        console.error("[GeminiProvider] Failed:", error);
        break;
      }
    }
  }

  // Fallback to mock
  console.warn("[GeminiProvider] Falling back to mock provider.");
  const fallback = await mockAsk(prompt, context);
  return {
    ...fallback,
    answer: "⚠️ Gemini quota exceeded (free tier limit reached). Showing mock response.\n\n" + fallback.answer,
    provider: "mock (quota exceeded)"
  };
}
