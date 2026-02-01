-- Add agent_id column to agents table
-- ClawdNet Identity System Migration

-- Add the agent_id column
ALTER TABLE agents ADD COLUMN IF NOT EXISTS agent_id TEXT UNIQUE;

-- Create index for agent_id lookups
CREATE INDEX IF NOT EXISTS agents_agent_id_idx ON agents(agent_id);

-- Add verification_level column
ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'none';

-- Update agent_stats with connections count
ALTER TABLE agent_stats ADD COLUMN IF NOT EXISTS connections_count INTEGER DEFAULT 0;

-- Backfill existing agents with agent IDs
-- This generates CLW-XXXX-XXXX format IDs for existing agents without one
DO $$
DECLARE
    agent_record RECORD;
    new_id TEXT;
BEGIN
    FOR agent_record IN SELECT id FROM agents WHERE agent_id IS NULL LOOP
        -- Generate a unique agent ID
        new_id := 'CLW-' || 
                  UPPER(SUBSTR(MD5(agent_record.id::TEXT || RANDOM()::TEXT), 1, 4)) || '-' ||
                  UPPER(SUBSTR(MD5(agent_record.id::TEXT || RANDOM()::TEXT), 5, 4));
        
        -- Update the agent
        UPDATE agents SET agent_id = new_id WHERE id = agent_record.id;
    END LOOP;
END $$;

-- Make agent_id NOT NULL after backfill
-- ALTER TABLE agents ALTER COLUMN agent_id SET NOT NULL;
