import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { computeRelationships } from '@/lib/ai/relationships';

/**
 * POST /api/nodes/[id]/embed
 * 
 * Generates an embedding for the node's content,
 * stores it, and updates semantic relationships.
 * 
 * Called automatically when a node's content is updated.
 */
export async function POST(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 1. Fetch the target node
  const { data: node, error: nodeError } = await supabase
    .from('nodes')
    .select('*')
    .eq('id', id)
    .single();

  if (nodeError || !node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }

  // 2. Check if content is meaningful (at least 10 chars)
  const text = `${node.title} ${node.content}`.trim();
  if (text.length < 10) {
    return NextResponse.json({ message: 'Content too short for embedding' }, { status: 200 });
  }

  // 3. Generate embedding
  const embedding = await generateEmbedding(text);
  if (!embedding) {
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }

  // 4. Store embedding on the node
  const { error: updateError } = await supabase
    .from('nodes')
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to store embedding:', updateError);
    return NextResponse.json({ error: 'Failed to store embedding' }, { status: 500 });
  }

  // 4.5 Track embedding usage (estimate ~1 token per 4 chars)
  const estimatedTokens = Math.ceil(text.length / 4);
  await supabase.rpc('increment_usage', {
    p_user_id: user.id,
    p_tokens: estimatedTokens,
    p_type: 'embedding',
  }).catch(() => {}); // non-blocking

  // 5. Fetch all other nodes in the same workspace (with embeddings)
  const { data: workspaceNodes } = await supabase
    .from('nodes')
    .select('id, embedding')
    .eq('workspace_id', node.workspace_id)
    .neq('id', id)
    .not('embedding', 'is', null);

  // Parse embeddings from JSON strings
  const parsedNodes = (workspaceNodes || []).map(n => ({
    ...n,
    embedding: typeof n.embedding === 'string' ? JSON.parse(n.embedding) : n.embedding,
  }));

  // 6. Compute relationships
  const targetWithEmbedding = { ...node, embedding };
  const relationships = computeRelationships(targetWithEmbedding, parsedNodes);

  console.log(`Node "${node.title}" — found ${parsedNodes.length} other embedded nodes, ${relationships.length} relationships created`);

  // 7. Delete old relationships for this node
  await supabase
    .from('node_relations')
    .delete()
    .or(`from_node.eq.${id},to_node.eq.${id}`);

  // 8. Insert new relationships
  if (relationships.length > 0) {
    const relationsToInsert = relationships.map(rel => ({
      workspace_id: node.workspace_id,
      from_node: rel.from_node,
      to_node: rel.to_node,
      similarity_score: rel.similarity_score,
      relation_type: 'semantic',
    }));

    const { error: relError } = await supabase
      .from('node_relations')
      .insert(relationsToInsert);

    if (relError) {
      console.error('Failed to insert relations:', relError);
    }
  }

  return NextResponse.json({
    message: 'Embedding generated and relationships updated',
    relationships_count: relationships.length,
  });
}
