export interface CompleteOptions {
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LLMClient {
  complete(prompt: string, options?: CompleteOptions): Promise<string>;
  embed(text: string): Promise<number[]>;
}
