import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/nodes/[id] — Update a node
 */
export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const updates = {};
  if (body.title !== undefined) {
    updates.title = body.title.trim().slice(0, 200);
  }
  if (body.content !== undefined) {
    updates.content = body.content.trim().slice(0, 50000);
  }
  if (body.color !== undefined) {
    updates.color = body.color;
  }
  if (body.position_x !== undefined) {
    updates.position_x = Number(body.position_x);
  }
  if (body.position_y !== undefined) {
    updates.position_y = Number(body.position_y);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // RLS ensures user can only update nodes in their own workspaces
  const { data, error } = await supabase
    .from('nodes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger embedding generation in background if content or title changed
  if (updates.title !== undefined || updates.content !== undefined) {
    const origin = request.headers.get('origin') || request.headers.get('host');
    const protocol = origin?.startsWith('http') ? '' : 'http://';
    const baseUrl = `${protocol}${origin}`;

    // Fire and forget — don't block the response
    fetch(`${baseUrl}/api/nodes/${id}/embed`, {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    }).catch(() => {
      // Silently fail — embedding is non-critical
    });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/nodes/[id] — Delete a node
 */
export async function DELETE(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from('nodes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
