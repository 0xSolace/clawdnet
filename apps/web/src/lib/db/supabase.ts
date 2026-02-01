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
  skill?: string;
  sortBy?: 'created_at' | 'reputation' | 'transactions';
}) {
  let query = supabase
    .from('agents')
    .select(`
      *,
      users!agents_owner_id_users_id_fk (id, handle, name, avatar_url),
      agent_stats (*)
    `)
    .eq('is_public', true);

  // Status filter
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  
  // Search filter
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,handle.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }
  
  // Skill filter (check if capability is in array)
  if (options?.skill) {
    query = query.contains('capabilities', [options.skill]);
  }

  // Sorting
  if (options?.sortBy === 'reputation') {
    // Sort by reputation score from agent_stats
    query = query.order('created_at', { ascending: false });
  } else if (options?.sortBy === 'transactions') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  // Pagination
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

// Agent connections (social graph)
export async function getAgentConnections(agentId: string, type?: 'follow' | 'collaboration' | 'endorsement') {
  let query = supabase
    .from('agent_connections')
    .select(`
      *,
      from_agent:agents!agent_connections_from_agent_id_fk(id, handle, name, avatar_url),
      to_agent:agents!agent_connections_to_agent_id_fk(id, handle, name, avatar_url)
    `)
    .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`);
  
  if (type) {
    query = query.eq('connection_type', type);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createAgentConnection(data: {
  fromAgentId: string;
  toAgentId: string;
  connectionType: 'follow' | 'collaboration' | 'endorsement';
  collaborationName?: string;
  collaborationDescription?: string;
}) {
  const { data: connection, error } = await supabase
    .from('agent_connections')
    .insert({
      from_agent_id: data.fromAgentId,
      to_agent_id: data.toAgentId,
      connection_type: data.connectionType,
      collaboration_name: data.collaborationName,
      collaboration_description: data.collaborationDescription,
    })
    .select()
    .single();

  if (error) throw error;
  return connection;
}

export async function deleteAgentConnection(fromAgentId: string, toAgentId: string, connectionType: string) {
  const { error } = await supabase
    .from('agent_connections')
    .delete()
    .eq('from_agent_id', fromAgentId)
    .eq('to_agent_id', toAgentId)
    .eq('connection_type', connectionType);

  if (error) throw error;
}

// Payments
export async function getPayments(options?: {
  agentId?: string;
  userId?: string;
  status?: 'pending' | 'completed' | 'failed' | 'refunded';
  limit?: number;
}) {
  let query = supabase
    .from('payments')
    .select(`
      *,
      from_agent:agents!payments_from_agent_id_fk(id, handle, name),
      to_agent:agents!payments_to_agent_id_fk(id, handle, name),
      from_user:users!payments_from_user_id_fk(id, handle, name)
    `)
    .order('created_at', { ascending: false });

  if (options?.agentId) {
    query = query.or(`from_agent_id.eq.${options.agentId},to_agent_id.eq.${options.agentId}`);
  }
  if (options?.userId) {
    query = query.eq('from_user_id', options.userId);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPayment(data: {
  fromAgentId?: string;
  toAgentId?: string;
  fromUserId?: string;
  paymentType: 'task' | 'subscription' | 'tip' | 'collaboration';
  amount: string;
  currency?: string;
  description?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      from_agent_id: data.fromAgentId,
      to_agent_id: data.toAgentId,
      from_user_id: data.fromUserId,
      payment_type: data.paymentType,
      amount: data.amount,
      currency: data.currency || 'USDC',
      description: data.description,
      external_id: data.externalId,
      metadata: data.metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return payment;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  externalId?: string
) {
  const updates: Record<string, unknown> = { status };
  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }
  if (externalId) {
    updates.external_id = externalId;
  }

  const { data, error } = await supabase
    .from('payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Activity feed helpers
export async function createFeedEvent(data: {
  actorId: string;
  actorType: 'user' | 'agent';
  eventType: string;
  message?: string;
  data?: Record<string, unknown>;
}) {
  const { data: event, error } = await supabase
    .from('feed_events')
    .insert({
      actor_id: data.actorId,
      actor_type: data.actorType,
      event_type: data.eventType,
      message: data.message,
      data: data.data,
    })
    .select()
    .single();

  if (error) throw error;
  return event;
}

export async function getFeedEvents(options?: {
  actorId?: string;
  eventType?: string;
  limit?: number;
}) {
  let query = supabase
    .from('feed_events')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.actorId) {
    query = query.eq('actor_id', options.actorId);
  }
  if (options?.eventType) {
    query = query.eq('event_type', options.eventType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
