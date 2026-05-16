import nvidia from './nvidia';

/**
 * Generate an embedding vector for the given text (for storing/indexing).
 * Uses input_type: 'passage' for document content.
 * 
 * @param {string} text - The text to embed
 * @returns {number[]} - The embedding vector (1024 dimensions)
 */
export async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const truncated = text.trim().slice(0, 8000);

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nv-embedqa-e5-v5',
        input: [truncated],
        input_type: 'passage',
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${response.status} ${err}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    return null;
  }
}

/**
 * Generate an embedding for a search query.
 * Uses input_type: 'query' for asymmetric retrieval.
 * 
 * @param {string} query - The search query
 * @returns {number[]} - The embedding vector
 */
export async function generateQueryEmbedding(query) {
  if (!query || query.trim().length === 0) {
    return null;
  }

  const truncated = query.trim().slice(0, 2000);

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nv-embedqa-e5-v5',
        input: [truncated],
        input_type: 'query',
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${response.status} ${err}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Query embedding generation failed:', error.message);
    return null;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * 
 * @param {number[]} a - First embedding
 * @param {number[]} b - Second embedding
 * @returns {number} - Similarity score between 0 and 1
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
