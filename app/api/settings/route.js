import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/settings — Fetch appearance settings for the current user
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('theme, accent_color')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return defaults if no row exists for the user
  const settings = data || {
    theme: 'dark',
    accent_color: '#10b981',
  };

  return NextResponse.json(settings);
}

/**
 * PUT /api/settings — Update appearance settings for the current user
 */
export async function PUT(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { theme, accent_color } = body;

  // Validate theme
  const validThemes = ['dark', 'light', 'system'];
  if (theme !== undefined && !validThemes.includes(theme)) {
    return NextResponse.json(
      { error: 'Invalid theme. Must be one of: dark, light, system' },
      { status: 400 }
    );
  }

  // Validate accent_color
  const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
  if (accent_color !== undefined && !hexColorRegex.test(accent_color)) {
    return NextResponse.json(
      { error: 'Invalid accent_color. Must be a valid hex color (e.g., #10b981)' },
      { status: 400 }
    );
  }

  // Build the upsert payload
  const upsertData = { user_id: user.id };
  if (theme !== undefined) upsertData.theme = theme;
  if (accent_color !== undefined) upsertData.accent_color = accent_color;

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(upsertData, { onConflict: 'user_id' })
    .select('theme, accent_color')
    .single();

  if (error) {
    console.error('PUT /api/settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
