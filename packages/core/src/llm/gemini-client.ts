import { ApiError, GoogleGenAI } from '@google/genai';
import type { CompleteOptions, LLMClient } from './types.js';

export interface GeminiClientOptions {
  apiKey?: string;
  generationModel?: string;
  embeddingModel?: string;
}

const DEFAULT_GENERATION_MODEL = 'gemini-3.7-flash';
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2';

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 1000;
const RETRYABLE_ERROR_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 429 || error.status === 503;
  }
  // The SDK only wraps HTTP-level failures into ApiError - a raw fetch()
  // failure (DNS, connection reset, timeout) surfaces as a plain network
  // error instead, and is just as worth retrying in a CI environment.
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    if (error instanceof TypeError && error.cause) return true;
    const code = (error as NodeJS.ErrnoException).code;
    if (code && RETRYABLE_ERROR_CODES.has(code)) return true;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt >= MAX_RETRIES) throw error;
      const delayMs = INITIAL_BACKOFF_MS * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export class GeminiClient implements LLMClient {
  private readonly client: GoogleGenAI;
  private readonly generationModel: string;
  private readonly embeddingModel: string;

  constructor(options: GeminiClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.SEAL_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key not found. Set SEAL_GEMINI_API_KEY (or GEMINI_API_KEY), or pass apiKey explicitly.',
      );
    }

    this.client = new GoogleGenAI({ apiKey });
    this.generationModel = options.generationModel ?? DEFAULT_GENERATION_MODEL;
    this.embeddingModel = options.embeddingModel ?? DEFAULT_EMBEDDING_MODEL;
  }

  async complete(prompt: string, options: CompleteOptions = {}): Promise<string> {
    const response = await withRetry(() =>
      this.client.models.generateContent({
        model: this.generationModel,
        contents: prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        },
      }),
    );

    const text = response.text;
    if (text === undefined) {
      throw new Error('Gemini returned no text content');
    }
    return text;
  }

  async embed(text: string): Promise<number[]> {
    const response = await withRetry(() =>
      this.client.models.embedContent({
        model: this.embeddingModel,
        contents: text,
      }),
    );

    const values = response.embeddings?.[0]?.values;
    if (!values) {
      throw new Error('Gemini returned no embedding values');
    }
    return values;
  }
}
