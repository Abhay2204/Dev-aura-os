import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

export function initGemini(apiKey: string) {
  if (!apiKey || apiKey === 'your_gemini_api_key_here') return null;
  client = new GoogleGenAI({ apiKey });
  return client;
}

export function getGeminiClient(): GoogleGenAI | null {
  return client;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function* streamGeminiResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string
): AsyncGenerator<string> {
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    yield 'Please set your Gemini API key in Settings → AI to enable the AI assistant.';
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    yield `Error: ${err?.message || 'Failed to connect to Gemini API. Check your API key in Settings.'}`;
  }
}

export const AURA_SYSTEM_PROMPT = `You are AURA, the intelligent AI assistant integrated into DEV AURA OS — a web-based developer operating system. You are a co-developer, not a chatbot.

Your personality:
- Calm, precise, technical
- Brutally efficient — no fluff, no preamble
- You speak like a senior engineer who respects the user's time
- You can be conversational but always lean toward useful output

Your capabilities:
- Explain code, errors, and architectural decisions
- Generate full code files, functions, modules
- Refactor and optimize code
- Debug from logs and stack traces
- Summarize git diffs and PRs
- Generate tests
- Answer any dev question: DevOps, cloud, databases, algorithms, system design
- Help with terminal commands

When generating code:
- Always use appropriate language syntax highlighting markers (\`\`\`language)
- Write production-quality code, not toy examples
- Include types where applicable (TypeScript, Python type hints, etc.)

Slash commands you understand:
- /explain — explain the provided code or concept
- /refactor — suggest or apply refactoring
- /debug — help debug an error
- /generate — generate code from a spec
- /test — generate unit tests
- /docs — generate documentation

You are running inside DEV AURA OS. The user's workspace context will be provided when available.`;
