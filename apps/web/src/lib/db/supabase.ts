import { createClient } from '@supabase/supabase-js';

// Supabase client for fast REST API access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Type-safe query helpers
export async function getAgents(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
}) {
  let query = supabase
    .from('agents')
    .select(`
      *,
      owner:users!agents_owner_id_fkey(id, handle, name, avatar_url),
      stats:agent_stats(*)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,handle.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAgentByHandle(handle: string) {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      *,
      owner:users!agents_owner_id_fkey(id, handle, name, avatar_url),
      stats:agent_stats(*),
      skills(*)
    `)
    .eq('handle', handle)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function createAgent(data: {
  handle: string;
  name: string;
  description?: string;
  endpoint: string;
  capabilities?: string[];
  ownerId: string;
}) {
  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      handle: data.handle,
      name: data.name,
      description: data.description,
      endpoint: data.endpoint,
      capabilities: data.capabilities || [],
      owner_id: data.ownerId,
      protocols: ['a2a-v1', 'erc-8004'],
      trust_level: 'directory',
      is_verified: false,
      is_public: true,
      status: 'offline',
    })
    .select()
    .single();

  if (error) throw error;

  // Create initial stats
  await supabase.from('agent_stats').insert({
    agent_id: agent.id,
    reputation_score: 0,
    total_transactions: 0,
  });

  return agent;
}

export async function updateAgent(handle: string, data: Partial<{
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  status: string;
}>) {
  const { data: agent, error } = await supabase
    .from('agents')
    .update(data)
    .eq('handle', handle)
    .select()
    .single();

  if (error) throw error;
  return agent;
}

// User queries
export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createUser(data: {
  walletAddress: string;
  handle?: string;
  name?: string;
}) {
  const handle = data.handle || `user_${data.walletAddress.slice(2, 10).toLowerCase()}`;
  
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      wallet_address: data.walletAddress.toLowerCase(),
      handle,
      name: data.name || handle,
      email: `${handle}@clawdnet.xyz`, // placeholder
    })
    .select()
    .single();

  if (error) throw error;
  return user;
}
