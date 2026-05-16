-- ============================================
-- Knowde — User Settings Table
-- Stores per-user appearance preferences
-- ============================================

-- 1. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT '#10b981',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id);

-- 3. UPDATED_AT TRIGGER (reuses existing function)
CREATE TRIGGER set_updated_at_user_settings
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
