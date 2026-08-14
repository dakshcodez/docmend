import { GoogleGenAI } from '@google/genai';
import type { CompleteOptions, LLMClient } from './types.js';

export interface GeminiClientOptions {
  apiKey?: string;
  generationModel?: string;
  embeddingModel?: string;
}

const DEFAULT_GENERATION_MODEL = 'gemini-3.7-flash';
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2';

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
    const response = await this.client.models.generateContent({
      model: this.generationModel,
      contents: prompt,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
      },
    });

    const text = response.text;
    if (text === undefined) {
      throw new Error('Gemini returned no text content');
    }
    return text;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.embeddingModel,
      contents: text,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values) {
      throw new Error('Gemini returned no embedding values');
    }
    return values;
  }
}
