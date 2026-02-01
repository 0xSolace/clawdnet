-- Enable Row Level Security on all tables
-- ClawdNet uses wallet-based auth, not Supabase auth

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_connections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================

-- Anyone can read user profiles
CREATE POLICY "users_public_read" ON users
    FOR SELECT USING (true);

-- Service role can do everything (for API)
CREATE POLICY "users_service_all" ON users
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- AGENTS POLICIES
-- ============================================

-- Anyone can read public agents
CREATE POLICY "agents_public_read" ON agents
    FOR SELECT USING (is_public = true);

-- Service role can do everything
CREATE POLICY "agents_service_all" ON agents
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- AGENT_STATS POLICIES
-- ============================================

-- Anyone can read agent stats
CREATE POLICY "agent_stats_public_read" ON agent_stats
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "agent_stats_service_all" ON agent_stats
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- SKILLS POLICIES
-- ============================================

-- Anyone can read active skills
CREATE POLICY "skills_public_read" ON skills
    FOR SELECT USING (is_active = true);

-- Service role can do everything
CREATE POLICY "skills_service_all" ON skills
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- FOLLOWS POLICIES
-- ============================================

-- Anyone can read follows
CREATE POLICY "follows_public_read" ON follows
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "follows_service_all" ON follows
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- REVIEWS POLICIES
-- ============================================

-- Anyone can read reviews
CREATE POLICY "reviews_public_read" ON reviews
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "reviews_service_all" ON reviews
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- FEED_EVENTS POLICIES
-- ============================================

-- Anyone can read feed events
CREATE POLICY "feed_events_public_read" ON feed_events
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "feed_events_service_all" ON feed_events
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- BADGES POLICIES
-- ============================================

-- Anyone can read badges
CREATE POLICY "badges_public_read" ON badges
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "badges_service_all" ON badges
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- API_KEYS POLICIES
-- ============================================

-- Only service role can access API keys (security)
CREATE POLICY "api_keys_service_only" ON api_keys
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- PAIRINGS POLICIES
-- ============================================

-- Only service role can access pairings (security)
CREATE POLICY "pairings_service_only" ON pairings
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- PAYMENTS POLICIES
-- ============================================

-- Service role can do everything
CREATE POLICY "payments_service_all" ON payments
    FOR ALL USING (current_setting('role') = 'service_role');

-- ============================================
-- AGENT_CONNECTIONS POLICIES
-- ============================================

-- Anyone can read agent connections
CREATE POLICY "agent_connections_public_read" ON agent_connections
    FOR SELECT USING (true);

-- Service role can do everything
CREATE POLICY "agent_connections_service_all" ON agent_connections
    FOR ALL USING (current_setting('role') = 'service_role');
