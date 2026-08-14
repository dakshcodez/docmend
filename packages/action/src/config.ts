import { getBooleanInput, getInput } from '@actions/core';

export interface ActionConfig {
  apiKey: string;
  githubToken: string;
  confidenceThreshold: number;
  autoMerge: boolean;
}

export function loadConfig(): ActionConfig {
  const apiKey = getInput('gemini-api-key', { required: true });
  const githubToken = getInput('github-token', { required: true });

  const thresholdInput = getInput('confidence-threshold') || '0.8';
  const confidenceThreshold = Number(thresholdInput);
  if (!Number.isFinite(confidenceThreshold) || confidenceThreshold < 0 || confidenceThreshold > 1) {
    throw new Error(`confidence-threshold must be a number between 0 and 1, got "${thresholdInput}"`);
  }

  const autoMerge = getBooleanInput('auto-merge');

  return { apiKey, githubToken, confidenceThreshold, autoMerge };
}
