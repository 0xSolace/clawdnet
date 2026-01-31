-- ClawdNet Database Seed Script
-- Populates the database with demo agents and test data

-- Create system user first (required for foreign key)
INSERT INTO users (id, handle, email, name, is_verified, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'system', 'system@clawdnet.xyz', 'System', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert demo agents
-- Sol (AI assistant)
INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'sol', '00000000-0000-0000-0000-000000000000', 'Sol', 'AI assistant for general questions, research, and creative tasks. Powered by Claude 3.5 Sonnet.', 'https://api.dicebear.com/7.x/bottts/svg?seed=sol', 'https://api.clawdnet.xyz/agents/sol', ARRAY['text-generation', 'analysis', 'research', 'creative-writing'], true, 'online', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- CodeBot (code generation)
INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222', 'coder', '00000000-0000-0000-0000-000000000000', 'CodeBot', 'Specialized code generation agent. Supports 20+ languages with debugging and optimization.', 'https://api.dicebear.com/7.x/bottts/svg?seed=coder', 'https://api.clawdnet.xyz/agents/coder', ARRAY['code-generation', 'debugging', 'code-review', 'documentation'], false, 'online', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- DALL-E Artist (image generation)
INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
VALUES ('33333333-3333-3333-3333-333333333333', 'artist', '00000000-0000-0000-0000-000000000000', 'DALL-E Artist', 'AI image generation specialist. Creates stunning visuals from text descriptions.', 'https://api.dicebear.com/7.x/bottts/svg?seed=artist', 'https://api.clawdnet.xyz/agents/artist', ARRAY['image-generation', 'image-editing', 'style-transfer'], true, 'busy', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ContentWriter (content creation)
INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
VALUES ('44444444-4444-4444-4444-444444444444', 'writer', '00000000-0000-0000-0000-000000000000', 'ContentWriter', 'Professional content creation agent. Blog posts, marketing copy, technical documentation.', 'https://api.dicebear.com/7.x/bottts/svg?seed=writer', 'https://api.clawdnet.xyz/agents/writer', ARRAY['content-writing', 'copywriting', 'technical-writing', 'editing'], false, 'online', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- WebResearcher (research)
INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
VALUES ('55555555-5555-5555-5555-555555555555', 'researcher', '00000000-0000-0000-0000-000000000000', 'WebResearcher', 'Deep web research and data analysis. Finds and synthesizes information from multiple sources.', 'https://api.dicebear.com/7.x/bottts/svg?seed=researcher', 'https://api.clawdnet.xyz/agents/researcher', ARRAY['web-research', 'data-analysis', 'fact-checking', 'summarization'], false, 'offline', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- PolyglotAI (translation)
INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
VALUES ('66666666-6666-6666-6666-666666666666', 'translator', '00000000-0000-0000-0000-000000000000', 'PolyglotAI', 'Multi-language translation agent. Supports 50+ languages with cultural context awareness.', 'https://api.dicebear.com/7.x/bottts/svg?seed=translator', 'https://api.clawdnet.xyz/agents/translator', ARRAY['translation', 'localization', 'language-detection'], true, 'online', NOW(), NOW())
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert skills for each agent
-- Sol's skills
INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'text-generation', 0.01, NOW(), NOW()),
('11111111-1111-1111-1111-111111111111', 'analysis', 0.02, NOW(), NOW()),
('11111111-1111-1111-1111-111111111111', 'research', 0.05, NOW(), NOW())
ON CONFLICT (agent_id, skill_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

-- CodeBot's skills
INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222222', 'code-generation', 0.03, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'debugging', 0.04, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', 'code-review', 0.02, NOW(), NOW())
ON CONFLICT (agent_id, skill_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

-- Artist's skills
INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333333', 'image-generation', 0.10, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'image-editing', 0.15, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', 'style-transfer', 0.08, NOW(), NOW())
ON CONFLICT (agent_id, skill_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

-- Writer's skills
INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at) VALUES
('44444444-4444-4444-4444-444444444444', 'content-writing', 0.05, NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'copywriting', 0.07, NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'technical-writing', 0.08, NOW(), NOW())
ON CONFLICT (agent_id, skill_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

-- Researcher's skills
INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at) VALUES
('55555555-5555-5555-5555-555555555555', 'web-research', 0.06, NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'data-analysis', 0.09, NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'fact-checking', 0.04, NOW(), NOW())
ON CONFLICT (agent_id, skill_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

-- Translator's skills
INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at) VALUES
('66666666-6666-6666-6666-666666666666', 'translation', 0.02, NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', 'localization', 0.08, NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', 'language-detection', 0.01, NOW(), NOW())
ON CONFLICT (agent_id, skill_id) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW();

-- Insert agent stats
INSERT INTO agent_stats (agent_id, reputation_score, total_transactions, successful_transactions, total_revenue, avg_response_ms, uptime_percent, reviews_count, avg_rating, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 4.9, 1547, 1532, 89.42, 1200, 98.5, 232, 4.9, NOW()),
('22222222-2222-2222-2222-222222222222', 4.7, 892, 869, 34.78, 2100, 96.2, 134, 4.7, NOW()),
('33333333-3333-3333-3333-333333333333', 4.8, 2156, 2089, 267.34, 8500, 94.7, 323, 4.8, NOW()),
('44444444-4444-4444-4444-444444444444', 4.6, 634, 612, 45.67, 3200, 92.1, 95, 4.6, NOW()),
('55555555-5555-5555-5555-555555555555', 4.4, 298, 287, 23.12, 5800, 87.3, 45, 4.4, NOW()),
('66666666-6666-6666-6666-666666666666', 4.9, 1823, 1809, 78.95, 900, 99.1, 273, 4.9, NOW())
ON CONFLICT (agent_id) DO UPDATE SET
  reputation_score = EXCLUDED.reputation_score,
  total_transactions = EXCLUDED.total_transactions,
  successful_transactions = EXCLUDED.successful_transactions,
  total_revenue = EXCLUDED.total_revenue,
  avg_response_ms = EXCLUDED.avg_response_ms,
  uptime_percent = EXCLUDED.uptime_percent,
  reviews_count = EXCLUDED.reviews_count,
  avg_rating = EXCLUDED.avg_rating,
  updated_at = NOW();

-- Insert some sample reviews
INSERT INTO reviews (agent_id, user_id, rating, content, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 5, 'Excellent AI assistant! Very helpful and accurate responses.', NOW() - INTERVAL '5 days', NOW()),
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 5, 'Love using Sol for research tasks. Always delivers quality results.', NOW() - INTERVAL '8 days', NOW()),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 5, 'Amazing code generation capabilities. Saved me hours of work!', NOW() - INTERVAL '3 days', NOW()),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 4, 'Good debugging help, though sometimes needs more context.', NOW() - INTERVAL '12 days', NOW()),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 5, 'Stunning image quality! Creative and follows prompts well.', NOW() - INTERVAL '2 days', NOW()),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 5, 'Best AI artist on the platform. Highly recommended!', NOW() - INTERVAL '7 days', NOW()),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 4, 'Good content quality, reasonable pricing.', NOW() - INTERVAL '6 days', NOW()),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 5, 'Perfect translations with cultural nuance. Impressive!', NOW() - INTERVAL '4 days', NOW()),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 5, 'Fast and accurate. Great for international projects.', NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (user_id, agent_id) DO NOTHING;

-- Insert some feed events for activity
INSERT INTO feed_events (actor_id, actor_type, event_type, data, message, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'agent', 'agent_registered', '{"capabilities": ["text-generation", "analysis", "research", "creative-writing"]}', 'Sol joined ClawdNet!', NOW() - INTERVAL '25 days'),
('22222222-2222-2222-2222-222222222222', 'agent', 'agent_registered', '{"capabilities": ["code-generation", "debugging", "code-review", "documentation"]}', 'CodeBot joined ClawdNet!', NOW() - INTERVAL '20 days'),
('33333333-3333-3333-3333-333333333333', 'agent', 'agent_registered', '{"capabilities": ["image-generation", "image-editing", "style-transfer"]}', 'DALL-E Artist joined ClawdNet!', NOW() - INTERVAL '18 days'),
('44444444-4444-4444-4444-444444444444', 'agent', 'agent_registered', '{"capabilities": ["content-writing", "copywriting", "technical-writing", "editing"]}', 'ContentWriter joined ClawdNet!', NOW() - INTERVAL '15 days'),
('55555555-5555-5555-5555-555555555555', 'agent', 'agent_registered', '{"capabilities": ["web-research", "data-analysis", "fact-checking", "summarization"]}', 'WebResearcher joined ClawdNet!', NOW() - INTERVAL '12 days'),
('66666666-6666-6666-6666-666666666666', 'agent', 'agent_registered', '{"capabilities": ["translation", "localization", "language-detection"]}', 'PolyglotAI joined ClawdNet!', NOW() - INTERVAL '22 days'),
('33333333-3333-3333-3333-333333333333', 'agent', 'skill_published', '{"skill": "image-generation"}', 'DALL-E Artist published a new skill: image-generation', NOW() - INTERVAL '17 days'),
('11111111-1111-1111-1111-111111111111', 'agent', 'milestone_reached', '{"transactions": 1000}', 'Sol reached 1000 successful transactions!', NOW() - INTERVAL '5 days'),
('66666666-6666-6666-6666-666666666666', 'agent', 'milestone_reached', '{"transactions": 1500}', 'PolyglotAI reached 1500 successful transactions!', NOW() - INTERVAL '3 days');