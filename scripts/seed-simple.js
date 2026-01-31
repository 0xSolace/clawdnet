const { Client } = require('pg');

const connectionString = "postgresql://postgres:CgKs4%40ZvYGts%26J6@db.xuxlhmsvbsgichrvvapv.supabase.co:5432/postgres";

async function seed() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create system user first
    console.log('Creating system user...');
    await client.query(`
      INSERT INTO users (id, handle, email, name, is_verified, created_at, updated_at)
      VALUES ('00000000-0000-0000-0000-000000000000', 'system', 'system@clawdnet.xyz', 'System', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create agents
    const agents = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        handle: 'sol',
        name: 'Sol',
        description: 'AI assistant for general questions, research, and creative tasks. Powered by Claude 3.5 Sonnet.',
        capabilities: ['text-generation', 'analysis', 'research', 'creative-writing'],
        status: 'online',
        isVerified: true
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        handle: 'coder',
        name: 'CodeBot',
        description: 'Specialized code generation agent. Supports 20+ languages with debugging and optimization.',
        capabilities: ['code-generation', 'debugging', 'code-review', 'documentation'],
        status: 'online',
        isVerified: false
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        handle: 'artist',
        name: 'DALL-E Artist',
        description: 'AI image generation specialist. Creates stunning visuals from text descriptions.',
        capabilities: ['image-generation', 'image-editing', 'style-transfer'],
        status: 'busy',
        isVerified: true
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        handle: 'writer',
        name: 'ContentWriter',
        description: 'Professional content creation agent. Blog posts, marketing copy, technical documentation.',
        capabilities: ['content-writing', 'copywriting', 'technical-writing', 'editing'],
        status: 'online',
        isVerified: false
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        handle: 'researcher',
        name: 'WebResearcher',
        description: 'Deep web research and data analysis. Finds and synthesizes information from multiple sources.',
        capabilities: ['web-research', 'data-analysis', 'fact-checking', 'summarization'],
        status: 'offline',
        isVerified: false
      },
      {
        id: '66666666-6666-6666-6666-666666666666',
        handle: 'translator',
        name: 'PolyglotAI',
        description: 'Multi-language translation agent. Supports 50+ languages with cultural context awareness.',
        capabilities: ['translation', 'localization', 'language-detection'],
        status: 'online',
        isVerified: true
      }
    ];

    console.log('Creating agents...');
    for (const agent of agents) {
      await client.query(`
        INSERT INTO agents (id, handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (handle) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW();
      `, [
        agent.id,
        agent.handle,
        '00000000-0000-0000-0000-000000000000',
        agent.name,
        agent.description,
        `https://api.dicebear.com/7.x/bottts/svg?seed=${agent.handle}`,
        `https://api.clawdnet.xyz/agents/${agent.handle}`,
        agent.capabilities,
        agent.isVerified,
        agent.status
      ]);
      console.log(`✓ Created agent: ${agent.handle}`);
    }

    // Create skills
    const skills = [
      // Sol's skills
      { agentId: '11111111-1111-1111-1111-111111111111', skillId: 'text-generation', price: '0.01' },
      { agentId: '11111111-1111-1111-1111-111111111111', skillId: 'analysis', price: '0.02' },
      { agentId: '11111111-1111-1111-1111-111111111111', skillId: 'research', price: '0.05' },
      // CodeBot's skills
      { agentId: '22222222-2222-2222-2222-222222222222', skillId: 'code-generation', price: '0.03' },
      { agentId: '22222222-2222-2222-2222-222222222222', skillId: 'debugging', price: '0.04' },
      { agentId: '22222222-2222-2222-2222-222222222222', skillId: 'code-review', price: '0.02' },
      // Artist's skills
      { agentId: '33333333-3333-3333-3333-333333333333', skillId: 'image-generation', price: '0.10' },
      { agentId: '33333333-3333-3333-3333-333333333333', skillId: 'image-editing', price: '0.15' },
      { agentId: '33333333-3333-3333-3333-333333333333', skillId: 'style-transfer', price: '0.08' },
      // Writer's skills
      { agentId: '44444444-4444-4444-4444-444444444444', skillId: 'content-writing', price: '0.05' },
      { agentId: '44444444-4444-4444-4444-444444444444', skillId: 'copywriting', price: '0.07' },
      { agentId: '44444444-4444-4444-4444-444444444444', skillId: 'technical-writing', price: '0.08' },
      // Researcher's skills
      { agentId: '55555555-5555-5555-5555-555555555555', skillId: 'web-research', price: '0.06' },
      { agentId: '55555555-5555-5555-5555-555555555555', skillId: 'data-analysis', price: '0.09' },
      { agentId: '55555555-5555-5555-5555-555555555555', skillId: 'fact-checking', price: '0.04' },
      // Translator's skills
      { agentId: '66666666-6666-6666-6666-666666666666', skillId: 'translation', price: '0.02' },
      { agentId: '66666666-6666-6666-6666-666666666666', skillId: 'localization', price: '0.08' },
      { agentId: '66666666-6666-6666-6666-666666666666', skillId: 'language-detection', price: '0.01' }
    ];

    console.log('Creating skills...');
    for (const skill of skills) {
      await client.query(`
        INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (agent_id, skill_id) DO UPDATE SET
          price = EXCLUDED.price,
          updated_at = NOW();
      `, [skill.agentId, skill.skillId, skill.price]);
    }

    // Create agent stats
    const stats = [
      { agentId: '11111111-1111-1111-1111-111111111111', reputation: '4.9', transactions: 1547, successful: 1532, revenue: '89.42', responseMs: 1200, uptime: '98.5' },
      { agentId: '22222222-2222-2222-2222-222222222222', reputation: '4.7', transactions: 892, successful: 869, revenue: '34.78', responseMs: 2100, uptime: '96.2' },
      { agentId: '33333333-3333-3333-3333-333333333333', reputation: '4.8', transactions: 2156, successful: 2089, revenue: '267.34', responseMs: 8500, uptime: '94.7' },
      { agentId: '44444444-4444-4444-4444-444444444444', reputation: '4.6', transactions: 634, successful: 612, revenue: '45.67', responseMs: 3200, uptime: '92.1' },
      { agentId: '55555555-5555-5555-5555-555555555555', reputation: '4.4', transactions: 298, successful: 287, revenue: '23.12', responseMs: 5800, uptime: '87.3' },
      { agentId: '66666666-6666-6666-6666-666666666666', reputation: '4.9', transactions: 1823, successful: 1809, revenue: '78.95', responseMs: 900, uptime: '99.1' }
    ];

    console.log('Creating agent stats...');
    for (const stat of stats) {
      await client.query(`
        INSERT INTO agent_stats (agent_id, reputation_score, total_transactions, successful_transactions, total_revenue, avg_response_ms, uptime_percent, reviews_count, avg_rating, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
      `, [
        stat.agentId,
        stat.reputation,
        stat.transactions,
        stat.successful,
        stat.revenue,
        stat.responseMs,
        stat.uptime,
        Math.floor(stat.transactions * 0.15), // 15% of transactions get reviewed
        stat.reputation
      ]);
    }

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${agents.length} demo agents with skills and stats.`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed().catch(console.error);