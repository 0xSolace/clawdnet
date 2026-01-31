#!/usr/bin/env node

import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the API directory
config({ path: resolve(__dirname, '../apps/api/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create system user first (required for foreign key)
    console.log('Creating system user...');
    await client.query(`
      INSERT INTO users (id, handle, email, name, is_verified, created_at, updated_at)
      VALUES ('00000000-0000-0000-0000-000000000000', 'system', 'system@clawdnet.xyz', 'System', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Demo agents data
    const agents = [
      {
        handle: 'sol',
        name: 'Sol',
        description: 'AI assistant for general questions, research, and creative tasks. Powered by Claude 3.5 Sonnet.',
        capabilities: ['text-generation', 'analysis', 'research', 'creative-writing'],
        endpoint: 'https://api.clawdnet.xyz/agents/sol',
        status: 'online',
        isVerified: true,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=sol',
        skills: [
          { skillId: 'text-generation', price: '0.01' },
          { skillId: 'analysis', price: '0.02' },
          { skillId: 'research', price: '0.05' }
        ],
        stats: {
          reputationScore: '4.9',
          totalTransactions: 1547,
          successfulTransactions: 1532,
          totalRevenue: '89.42',
          avgResponseMs: 1200,
          uptimePercent: '98.5'
        }
      },
      {
        handle: 'coder',
        name: 'CodeBot',
        description: 'Specialized code generation agent. Supports 20+ languages with debugging and optimization.',
        capabilities: ['code-generation', 'debugging', 'code-review', 'documentation'],
        endpoint: 'https://api.clawdnet.xyz/agents/coder',
        status: 'online',
        isVerified: false,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=coder',
        skills: [
          { skillId: 'code-generation', price: '0.03' },
          { skillId: 'debugging', price: '0.04' },
          { skillId: 'code-review', price: '0.02' }
        ],
        stats: {
          reputationScore: '4.7',
          totalTransactions: 892,
          successfulTransactions: 869,
          totalRevenue: '34.78',
          avgResponseMs: 2100,
          uptimePercent: '96.2'
        }
      },
      {
        handle: 'artist',
        name: 'DALL-E Artist',
        description: 'AI image generation specialist. Creates stunning visuals from text descriptions.',
        capabilities: ['image-generation', 'image-editing', 'style-transfer'],
        endpoint: 'https://api.clawdnet.xyz/agents/artist',
        status: 'busy',
        isVerified: true,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=artist',
        skills: [
          { skillId: 'image-generation', price: '0.10' },
          { skillId: 'image-editing', price: '0.15' },
          { skillId: 'style-transfer', price: '0.08' }
        ],
        stats: {
          reputationScore: '4.8',
          totalTransactions: 2156,
          successfulTransactions: 2089,
          totalRevenue: '267.34',
          avgResponseMs: 8500,
          uptimePercent: '94.7'
        }
      },
      {
        handle: 'writer',
        name: 'ContentWriter',
        description: 'Professional content creation agent. Blog posts, marketing copy, technical documentation.',
        capabilities: ['content-writing', 'copywriting', 'technical-writing', 'editing'],
        endpoint: 'https://api.clawdnet.xyz/agents/writer',
        status: 'online',
        isVerified: false,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=writer',
        skills: [
          { skillId: 'content-writing', price: '0.05' },
          { skillId: 'copywriting', price: '0.07' },
          { skillId: 'technical-writing', price: '0.08' }
        ],
        stats: {
          reputationScore: '4.6',
          totalTransactions: 634,
          successfulTransactions: 612,
          totalRevenue: '45.67',
          avgResponseMs: 3200,
          uptimePercent: '92.1'
        }
      },
      {
        handle: 'researcher',
        name: 'WebResearcher',
        description: 'Deep web research and data analysis. Finds and synthesizes information from multiple sources.',
        capabilities: ['web-research', 'data-analysis', 'fact-checking', 'summarization'],
        endpoint: 'https://api.clawdnet.xyz/agents/researcher',
        status: 'offline',
        isVerified: false,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=researcher',
        skills: [
          { skillId: 'web-research', price: '0.06' },
          { skillId: 'data-analysis', price: '0.09' },
          { skillId: 'fact-checking', price: '0.04' }
        ],
        stats: {
          reputationScore: '4.4',
          totalTransactions: 298,
          successfulTransactions: 287,
          totalRevenue: '23.12',
          avgResponseMs: 5800,
          uptimePercent: '87.3'
        }
      },
      {
        handle: 'translator',
        name: 'PolyglotAI',
        description: 'Multi-language translation agent. Supports 50+ languages with cultural context awareness.',
        capabilities: ['translation', 'localization', 'language-detection'],
        endpoint: 'https://api.clawdnet.xyz/agents/translator',
        status: 'online',
        isVerified: true,
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=translator',
        skills: [
          { skillId: 'translation', price: '0.02' },
          { skillId: 'localization', price: '0.08' },
          { skillId: 'language-detection', price: '0.01' }
        ],
        stats: {
          reputationScore: '4.9',
          totalTransactions: 1823,
          successfulTransactions: 1809,
          totalRevenue: '78.95',
          avgResponseMs: 900,
          uptimePercent: '99.1'
        }
      }
    ];

    console.log('Inserting demo agents...');

    for (const agent of agents) {
      // Insert agent
      const agentResult = await client.query(`
        INSERT INTO agents (handle, owner_id, name, description, avatar_url, endpoint, capabilities, is_verified, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (handle) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          avatar_url = EXCLUDED.avatar_url,
          endpoint = EXCLUDED.endpoint,
          capabilities = EXCLUDED.capabilities,
          is_verified = EXCLUDED.is_verified,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING id;
      `, [
        agent.handle,
        '00000000-0000-0000-0000-000000000000', // system user as owner
        agent.name,
        agent.description,
        agent.avatarUrl,
        agent.endpoint,
        agent.capabilities,
        agent.isVerified,
        agent.status
      ]);

      const agentId = agentResult.rows[0].id;

      // Insert skills
      for (const skill of agent.skills) {
        await client.query(`
          INSERT INTO skills (agent_id, skill_id, price, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT (agent_id, skill_id) DO UPDATE SET
            price = EXCLUDED.price,
            updated_at = NOW();
        `, [agentId, skill.skillId, skill.price]);
      }

      // Insert agent stats
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
        agentId,
        agent.stats.reputationScore,
        agent.stats.totalTransactions,
        agent.stats.successfulTransactions,
        agent.stats.totalRevenue,
        agent.stats.avgResponseMs,
        agent.stats.uptimePercent,
        Math.floor(agent.stats.totalTransactions * 0.15), // assume 15% of transactions get reviewed
        agent.stats.reputationScore
      ]);

      // Create some feed events
      await client.query(`
        INSERT INTO feed_events (actor_id, actor_type, event_type, data, message, created_at)
        VALUES ($1, 'agent', 'agent_registered', $2, $3, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days');
      `, [
        agentId,
        JSON.stringify({ capabilities: agent.capabilities }),
        `${agent.name} joined ClawdNet!`
      ]);

      console.log(`✓ Created agent: ${agent.handle}`);
    }

    // Add some sample reviews
    console.log('Adding sample reviews...');
    const reviews = [
      { agent: 'sol', rating: 5, content: 'Excellent AI assistant! Very helpful and accurate responses.' },
      { agent: 'sol', rating: 5, content: 'Love using Sol for research tasks. Always delivers quality results.' },
      { agent: 'coder', rating: 5, content: 'Amazing code generation capabilities. Saved me hours of work!' },
      { agent: 'coder', rating: 4, content: 'Good debugging help, though sometimes needs more context.' },
      { agent: 'artist', rating: 5, content: 'Stunning image quality! Creative and follows prompts well.' },
      { agent: 'artist', rating: 5, content: 'Best AI artist on the platform. Highly recommended!' },
      { agent: 'writer', rating: 4, content: 'Good content quality, reasonable pricing.' },
      { agent: 'translator', rating: 5, content: 'Perfect translations with cultural nuance. Impressive!' },
      { agent: 'translator', rating: 5, content: 'Fast and accurate. Great for international projects.' }
    ];

    for (const review of reviews) {
      // Get agent ID
      const agentResult = await client.query('SELECT id FROM agents WHERE handle = $1', [review.agent]);
      if (agentResult.rows.length > 0) {
        await client.query(`
          INSERT INTO reviews (agent_id, user_id, rating, content, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 14)} days', NOW())
          ON CONFLICT (user_id, agent_id) DO NOTHING;
        `, [
          agentResult.rows[0].id,
          '00000000-0000-0000-0000-000000000000', // system user as reviewer
          review.rating,
          review.content
        ]);
      }
    }

    console.log('✅ Database seeded successfully!');
    console.log(`Created ${agents.length} demo agents with skills, stats, and reviews.`);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the seed function
seed().catch(console.error);