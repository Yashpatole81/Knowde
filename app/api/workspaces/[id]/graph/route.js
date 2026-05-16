import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cosineSimilarity } from '@/lib/ai/embeddings';

/**
 * GET /api/workspaces/[id]/graph
 * 
 * Returns a graphify-style semantic graph:
 * - Nodes with importance scores (god nodes)
 * - Edges with confidence classification
 * - Community detection (connected clusters)
 * - Surprising cross-community connections
 */
export async function GET(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const { data: allNodes } = await supabase
    .from('nodes')
    .select('id, title, content, color, tag_id, embedding, created_at')
    .eq('workspace_id', id)
    .order('created_at', { ascending: true });

  if (!allNodes || allNodes.length === 0) {
    return NextResponse.json({ nodes: [], edges: [], communities: [], godNodes: [], stats: {} });
  }

  // Parse embeddings
  const nodesWithEmbeddings = allNodes.map(node => ({
    ...node,
    embedding: node.embedding 
      ? (typeof node.embedding === 'string' ? JSON.parse(node.embedding) : node.embedding)
      : null,
  }));

  // Compute ALL pairwise similarities
  const STRONG_THRESHOLD = 0.60;
  const MEDIUM_THRESHOLD = 0.45;
  const WEAK_THRESHOLD = 0.35;
  
  const edges = [];
  const adjacency = {};

  // Initialize adjacency
  for (const node of nodesWithEmbeddings) {
    adjacency[node.id] = [];
  }

  for (let i = 0; i < nodesWithEmbeddings.length; i++) {
    if (!nodesWithEmbeddings[i].embedding) continue;

    for (let j = i + 1; j < nodesWithEmbeddings.length; j++) {
      if (!nodesWithEmbeddings[j].embedding) continue;

      const score = cosineSimilarity(
        nodesWithEmbeddings[i].embedding,
        nodesWithEmbeddings[j].embedding
      );

      if (score >= WEAK_THRESHOLD) {
        const edge = {
          source: nodesWithEmbeddings[i].id,
          target: nodesWithEmbeddings[j].id,
          weight: Math.round(score * 1000) / 1000,
          confidence: score >= STRONG_THRESHOLD ? 'strong' : score >= MEDIUM_THRESHOLD ? 'medium' : 'weak',
        };
        edges.push(edge);
        adjacency[edge.source].push(edge.target);
        adjacency[edge.target].push(edge.source);
      }
    }
  }

  // Community detection (Louvain-inspired greedy modularity)
  const communities = detectCommunities(nodesWithEmbeddings, adjacency, MEDIUM_THRESHOLD, edges);

  // God nodes — highest degree centrality (most connections)
  const degreeCentrality = {};
  for (const node of nodesWithEmbeddings) {
    degreeCentrality[node.id] = adjacency[node.id]?.length || 0;
  }

  const sortedByDegree = Object.entries(degreeCentrality)
    .sort(([, a], [, b]) => b - a);

  const maxDegree = sortedByDegree[0]?.[1] || 1;
  const godNodes = sortedByDegree
    .filter(([, degree]) => degree > 0)
    .slice(0, 3)
    .map(([nodeId, degree]) => ({
      id: nodeId,
      title: allNodes.find(n => n.id === nodeId)?.title || '',
      degree,
      importance: Math.round((degree / maxDegree) * 100) / 100,
    }));

  // Surprising connections — edges that cross community boundaries
  const surprisingConnections = edges
    .filter(edge => {
      const sourceCommunity = communities.find(c => c.nodes.includes(edge.source));
      const targetCommunity = communities.find(c => c.nodes.includes(edge.target));
      return sourceCommunity && targetCommunity && sourceCommunity.id !== targetCommunity.id;
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map(edge => ({
      ...edge,
      sourceTitle: allNodes.find(n => n.id === edge.source)?.title,
      targetTitle: allNodes.find(n => n.id === edge.target)?.title,
    }));

  // Build graph nodes with metadata
  const graphNodes = allNodes.map(node => {
    const degree = degreeCentrality[node.id] || 0;
    const community = communities.find(c => c.nodes.includes(node.id));
    
    return {
      id: node.id,
      title: node.title,
      color: node.color,
      tag_id: node.tag_id,
      has_embedding: !!nodesWithEmbeddings.find(n => n.id === node.id)?.embedding,
      content_preview: (node.content || '').slice(0, 150),
      degree,
      importance: maxDegree > 0 ? Math.round((degree / maxDegree) * 100) / 100 : 0,
      community_id: community?.id ?? null,
      is_god_node: godNodes.some(g => g.id === node.id),
    };
  });

  return NextResponse.json({
    nodes: graphNodes,
    edges: edges.filter(e => e.confidence !== 'weak'), // Only show medium+ in graph
    all_edges: edges, // Include weak for data completeness
    communities,
    godNodes,
    surprisingConnections,
    stats: {
      total_nodes: allNodes.length,
      embedded_nodes: nodesWithEmbeddings.filter(n => n.embedding).length,
      total_edges: edges.length,
      visible_edges: edges.filter(e => e.confidence !== 'weak').length,
      total_communities: communities.length,
      god_nodes: godNodes.length,
    },
  });
}

/**
 * Community detection using BFS connected components on medium+ edges,
 * then splitting large communities by internal density.
 */
function detectCommunities(nodes, adjacency, threshold, edges) {
  // Build adjacency using only medium+ edges
  const strongAdj = {};
  for (const node of nodes) {
    strongAdj[node.id] = [];
  }
  for (const edge of edges) {
    if (edge.weight >= threshold) {
      strongAdj[edge.source]?.push(edge.target);
      strongAdj[edge.target]?.push(edge.source);
    }
  }

  const visited = new Set();
  const communities = [];
  let clusterId = 0;

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    if (!strongAdj[node.id] || strongAdj[node.id].length === 0) continue;

    const queue = [node.id];
    const community = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      community.push(current);

      for (const neighbor of (strongAdj[current] || [])) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (community.length >= 2) {
      // Calculate internal cohesion
      let internalEdges = 0;
      const maxPossible = (community.length * (community.length - 1)) / 2;
      
      for (const edge of edges) {
        if (community.includes(edge.source) && community.includes(edge.target)) {
          internalEdges++;
        }
      }

      communities.push({
        id: clusterId++,
        nodes: community,
        size: community.length,
        cohesion: maxPossible > 0 ? Math.round((internalEdges / maxPossible) * 100) / 100 : 0,
      });
    }
  }

  return communities;
}
