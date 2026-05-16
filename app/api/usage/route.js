import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/usage — Fetch usage data for the current user
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('usage')
    .select('total_tokens, embedding_tokens, chat_tokens, request_count, plan_type')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return zeros/defaults if no row exists for the user
  const usage = data || {
    total_tokens: 0,
    embedding_tokens: 0,
    chat_tokens: 0,
    request_count: 0,
    plan_type: 'free',
  };

  return NextResponse.json(usage);
}
