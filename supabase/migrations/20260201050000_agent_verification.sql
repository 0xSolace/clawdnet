-- Agent Verification System
-- Stores verification results and history

-- ============================================
-- AGENT VERIFICATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS agent_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Verification level
    verification_level TEXT NOT NULL DEFAULT 'none' 
        CHECK (verification_level IN ('none', 'basic', 'verified', 'trusted')),
    
    -- Individual check results
    endpoint_reachable BOOLEAN DEFAULT false,
    endpoint_response_ms INTEGER,
    endpoint_status_code INTEGER,
    
    a2a_protocol_supported BOOLEAN DEFAULT false,
    a2a_version TEXT,
    
    erc8004_supported BOOLEAN DEFAULT false,
    erc8004_services TEXT[],
    
    owner_verified BOOLEAN DEFAULT false,
    
    -- Overall status
    passed BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0,
    error_message TEXT,
    
    -- Timestamps
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_check_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_agent_verifications_agent ON agent_verifications(agent_id);
CREATE INDEX idx_agent_verifications_checked ON agent_verifications(checked_at DESC);
CREATE INDEX idx_agent_verifications_next_check ON agent_verifications(next_check_at);

-- Add verification_level column to agents if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'verification_level'
    ) THEN
        ALTER TABLE agents ADD COLUMN verification_level TEXT DEFAULT 'none'
            CHECK (verification_level IN ('none', 'basic', 'verified', 'trusted'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'last_verified_at'
    ) THEN
        ALTER TABLE agents ADD COLUMN last_verified_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add columns to agent_stats for trust calculations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_stats' AND column_name = 'days_on_network'
    ) THEN
        ALTER TABLE agent_stats ADD COLUMN days_on_network INTEGER DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get latest verification for an agent
CREATE OR REPLACE FUNCTION get_latest_verification(p_agent_id UUID)
RETURNS agent_verifications AS $$
    SELECT * FROM agent_verifications 
    WHERE agent_id = p_agent_id 
    ORDER BY checked_at DESC 
    LIMIT 1;
$$ LANGUAGE SQL;

-- Check if agent qualifies for trusted status
CREATE OR REPLACE FUNCTION check_trusted_eligibility(p_agent_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats RECORD;
    v_agent RECORD;
    v_days INTEGER;
    v_eligible BOOLEAN := true;
    v_reasons JSONB := '[]'::JSONB;
BEGIN
    -- Get agent and stats
    SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
    SELECT * INTO v_stats FROM agent_stats WHERE agent_id = p_agent_id;
    
    IF v_agent IS NULL THEN
        RETURN jsonb_build_object('eligible', false, 'reasons', '["Agent not found"]'::JSONB);
    END IF;
    
    -- Calculate days on network
    v_days := EXTRACT(DAY FROM (now() - v_agent.created_at));
    
    -- Check requirements
    IF COALESCE(v_stats.total_transactions, 0) < 30 THEN
        v_eligible := false;
        v_reasons := v_reasons || jsonb_build_array(
            format('Need 30+ transactions (current: %s)', COALESCE(v_stats.total_transactions, 0))
        );
    END IF;
    
    IF COALESCE(v_stats.avg_rating::NUMERIC, 0) < 4.5 THEN
        v_eligible := false;
        v_reasons := v_reasons || jsonb_build_array(
            format('Need 4.5+ rating (current: %s)', COALESCE(v_stats.avg_rating, '0'))
        );
    END IF;
    
    IF COALESCE(v_stats.uptime_percent::NUMERIC, 0) < 95 THEN
        v_eligible := false;
        v_reasons := v_reasons || jsonb_build_array(
            format('Need 95%% uptime (current: %s%%)', COALESCE(v_stats.uptime_percent, '0'))
        );
    END IF;
    
    IF v_days < 30 THEN
        v_eligible := false;
        v_reasons := v_reasons || jsonb_build_array(
            format('Need 30+ days on network (current: %s)', v_days)
        );
    END IF;
    
    IF NOT v_agent.is_verified THEN
        v_eligible := false;
        v_reasons := v_reasons || jsonb_build_array('Must be verified first');
    END IF;
    
    RETURN jsonb_build_object(
        'eligible', v_eligible,
        'reasons', v_reasons,
        'stats', jsonb_build_object(
            'transactions', COALESCE(v_stats.total_transactions, 0),
            'rating', COALESCE(v_stats.avg_rating, '0'),
            'uptime', COALESCE(v_stats.uptime_percent, '0'),
            'days', v_days
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE agent_verifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read verifications
CREATE POLICY "agent_verifications_public_read" ON agent_verifications
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "agent_verifications_service_all" ON agent_verifications
    FOR ALL USING (current_setting('role') = 'service_role');
