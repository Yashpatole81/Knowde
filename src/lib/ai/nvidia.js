import OpenAI from 'openai';

/**
 * NVIDIA AI client using OpenAI-compatible API.
 * Used for embeddings and chat completions.
 */
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export default nvidia;
