-- ============================================
-- Knowde — Usage Tracking RPC Function
-- Atomically increments usage counters
-- ============================================

CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_tokens INT DEFAULT 0,
  p_type TEXT DEFAULT 'chat'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage (user_id, total_tokens, embedding_tokens, chat_tokens, request_count)
  VALUES (
    p_user_id,
    p_tokens,
    CASE WHEN p_type = 'embedding' THEN p_tokens ELSE 0 END,
    CASE WHEN p_type = 'chat' THEN p_tokens ELSE 0 END,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_tokens = usage.total_tokens + p_tokens,
    embedding_tokens = usage.embedding_tokens + CASE WHEN p_type = 'embedding' THEN p_tokens ELSE 0 END,
    chat_tokens = usage.chat_tokens + CASE WHEN p_type = 'chat' THEN p_tokens ELSE 0 END,
    request_count = usage.request_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
