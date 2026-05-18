import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQueryEmbedding, cosineSimilarity } from '@/lib/ai/embeddings';
import nvidia from '@/lib/ai/nvidia';

/**
 * POST /api/ask
 * 
 * RAG endpoint: Takes a user question, finds relevant nodes
 * via semantic search, and generates an AI response.
 * 
 * Body: { query: string, workspace_id: string }
 */
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { query, workspace_id } = body;

  if (!query || !workspace_id) {
    return NextResponse.json({ error: 'query and workspace_id are required' }, { status: 400 });
  }

  // 1. Verify workspace belongs to user
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspace_id)
    .eq('user_id', user.id)
    .single();

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }

  // 2. Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query);
  if (!queryEmbedding) {
    return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
  }

  // 3. Fetch all nodes with embeddings in this workspace
  const { data: nodes } = await supabase
    .from('nodes')
    .select('id, title, content, embedding, tag_id')
    .eq('workspace_id', workspace_id)
    .not('embedding', 'is', null);

  // Also fetch all nodes (including those without embeddings) for workspace-level questions
  const { data: allNodes } = await supabase
    .from('nodes')
    .select('id, title, content, tag_id')
    .eq('workspace_id', workspace_id);

  if (!allNodes || allNodes.length === 0) {
    return NextResponse.json({
      answer: "This workspace doesn't have any nodes yet. Create some nodes with content and I'll be able to help.",
      relevant_nodes: [],
    });
  }

  // 4. Calculate similarity and rank nodes
  let topNodes = [];

  if (nodes && nodes.length > 0) {
    const scoredNodes = nodes.map(node => {
      const embedding = typeof node.embedding === 'string' 
        ? JSON.parse(node.embedding) 
        : node.embedding;
      
      const score = cosineSimilarity(queryEmbedding, embedding);
      return { ...node, score };
    });

    // Sort by relevance and take top 5
    scoredNodes.sort((a, b) => b.score - a.score);
    topNodes = scoredNodes.slice(0, 5).filter(n => n.score > 0.4);
  }

  // Fallback: if no relevant nodes found via embedding, include all nodes as context
  // This handles workspace-level questions like "what nodes exist?" or "what is this workspace about?"
  const contextNodes = topNodes.length > 0 ? topNodes : allNodes.slice(0, 10).map(n => ({ ...n, score: 0 }));

  // 5. Build context from relevant nodes
  const context = contextNodes.map((node, i) => 
    `[Node ${i + 1}: "${node.title}"]\n${node.content || '(no content)'}`
  ).join('\n\n---\n\n');

  // 6. Generate AI response using NVIDIA LLM
  const systemPrompt = `You are Knowde AI, an intelligent assistant that helps users explore and understand their knowledge workspace "${workspace.name}".

You answer questions based on the provided context from the user's nodes. The workspace contains ${allNodes.length} nodes total.

Here are all node titles in this workspace: ${allNodes.map(n => `"${n.title}"`).join(', ')}

Be concise, helpful, and reference specific nodes when relevant. If asked about what's in the workspace, list the nodes and summarize their content.`;

  const userPrompt = `Context from workspace nodes:

${context}

---

User question: ${query}`;

  try {
    const completion = await nvidia.chat.completions.create({
      model: 'meta/llama-3.1-8b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content || 'Unable to generate a response.';

    // 7. Store the query in ai_queries table
    await supabase.from('ai_queries').insert({
      user_id: user.id,
      workspace_id,
      query,
      response: answer,
      tokens_used: completion.usage?.total_tokens || 0,
    });

    // 8. Track usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    try {
      await supabase.rpc('increment_usage', {
        p_user_id: user.id,
        p_tokens: tokensUsed,
        p_type: 'chat',
      });
    } catch (_) {} // non-blocking

    // 9. Return response with relevant node references
    return NextResponse.json({
      answer,
      relevant_nodes: contextNodes.filter(n => n.score > 0).map(n => ({
        id: n.id,
        title: n.title,
        tag_id: n.tag_id,
        score: Math.round(n.score * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('LLM generation failed:', error.message);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
