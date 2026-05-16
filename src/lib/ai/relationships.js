import { cosineSimilarity } from './embeddings';

/**
 * Minimum similarity threshold to create a relationship.
 * Nodes below this score won't be connected.
 */
const SIMILARITY_THRESHOLD = 0.45;

/**
 * Maximum number of relationships per node.
 */
const MAX_RELATIONS_PER_NODE = 10;

/**
 * Given a node's embedding and all other nodes in the workspace,
 * compute which nodes should be connected.
 * 
 * @param {object} targetNode - The node that was just updated (must have embedding)
 * @param {object[]} workspaceNodes - All other nodes in the workspace (with embeddings)
 * @returns {object[]} - Array of { from_node, to_node, similarity_score }
 */
export function computeRelationships(targetNode, workspaceNodes) {
  if (!targetNode.embedding) return [];

  const similarities = [];

  for (const node of workspaceNodes) {
    // Skip self
    if (node.id === targetNode.id) continue;
    // Skip nodes without embeddings
    if (!node.embedding) continue;

    const score = cosineSimilarity(targetNode.embedding, node.embedding);

    if (score >= SIMILARITY_THRESHOLD) {
      similarities.push({
        from_node: targetNode.id,
        to_node: node.id,
        similarity_score: Math.round(score * 1000) / 1000, // 3 decimal places
      });
    }
  }

  // Sort by similarity (highest first) and limit
  similarities.sort((a, b) => b.similarity_score - a.similarity_score);
  return similarities.slice(0, MAX_RELATIONS_PER_NODE);
}
