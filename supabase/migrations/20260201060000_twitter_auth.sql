-- Add Twitter authentication fields to users table
-- ClawdNet Twitter OAuth support

-- ============================================
-- ADD TWITTER FIELDS TO USERS
-- ============================================

-- Add Twitter-specific columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS twitter_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS twitter_avatar TEXT,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'wallet';

-- Create index for faster Twitter ID lookups
CREATE INDEX IF NOT EXISTS users_twitter_id_idx ON users(twitter_id);
CREATE INDEX IF NOT EXISTS users_twitter_handle_idx ON users(twitter_handle);
CREATE INDEX IF NOT EXISTS users_auth_provider_idx ON users(auth_provider);

-- Add claim_code and claimed_at to agents if not exists
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS claim_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Create index for claim code lookups
CREATE INDEX IF NOT EXISTS agents_claim_code_idx ON agents(claim_code);

-- Comment on columns
COMMENT ON COLUMN users.twitter_id IS 'Twitter user ID (unique)';
COMMENT ON COLUMN users.twitter_handle IS 'Twitter username/handle';
COMMENT ON COLUMN users.twitter_avatar IS 'Twitter profile image URL';
COMMENT ON COLUMN users.auth_provider IS 'Primary auth provider: twitter, wallet, etc';
COMMENT ON COLUMN agents.claim_code IS 'One-time code for claiming unclaimed agents';
COMMENT ON COLUMN agents.claimed_at IS 'When the agent was claimed by a human';

-- ============================================
-- UPDATE BADGE DEFINITIONS
-- ============================================

-- Insert twitter_verified badge if not exists
INSERT INTO badges (user_id, badge_id)
SELECT id, 'badge_definition' 
FROM users 
WHERE false; -- Just to get the table structure

-- ============================================
-- HELPER FUNCTION FOR GENERATING CLAIM CODES
-- ============================================

CREATE OR REPLACE FUNCTION generate_claim_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No 0, O, 1, I
  result TEXT := '';
  i INT;
BEGIN
  -- Format: XXXX-XXXX-XXXX
  FOR i IN 1..12 LOOP
    IF i = 5 OR i = 9 THEN
      result := result || '-';
    END IF;
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER TO AUTO-GENERATE CLAIM CODES
-- ============================================

CREATE OR REPLACE FUNCTION set_agent_claim_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_code IS NULL AND NEW.owner_id IS NULL THEN
    NEW.claim_code := generate_claim_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'agents_claim_code_trigger'
  ) THEN
    CREATE TRIGGER agents_claim_code_trigger
    BEFORE INSERT ON agents
    FOR EACH ROW
    EXECUTE FUNCTION set_agent_claim_code();
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION generate_claim_code() IS 'Generates a human-readable claim code in XXXX-XXXX-XXXX format';
COMMENT ON FUNCTION set_agent_claim_code() IS 'Auto-generates claim codes for unclaimed agents';
