#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running ClawdNet Identity System Migration...');
  
  // We'll use Supabase's RPC to run raw SQL
  // Note: This requires the pg_sql extension or direct DB access
  
  // For now, let's add agent_id to agents without it using the Supabase client
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, agent_id')
    .is('agent_id', null);
  
  if (error) {
    console.error('Error fetching agents:', error);
    return;
  }
  
  console.log(`Found ${agents?.length || 0} agents without agent_id`);
  
  for (const agent of agents || []) {
    // Generate CLW-XXXX-XXXX format
    const hex = [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');
    const agentId = `CLW-${hex.slice(0,4)}-${hex.slice(4,8)}`;
    
    const { error: updateError } = await supabase
      .from('agents')
      .update({ agent_id: agentId })
      .eq('id', agent.id);
    
    if (updateError) {
      console.error(`Failed to update agent ${agent.id}:`, updateError);
    } else {
      console.log(`Updated agent ${agent.id} with ID: ${agentId}`);
    }
  }
  
  console.log('Migration complete!');
}

runMigration().catch(console.error);
