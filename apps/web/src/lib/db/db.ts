/**
 * ClawdNet Database Client
 * 
 * This module provides typed database access via:
 * 1. Drizzle ORM for complex queries and type safety
 * 2. Supabase client for fast REST access and realtime
 * 
 * Usage:
 *   import { db, supabase, getAgents, createAgent } from '@/lib/db/db';
 */

// Re-export everything from index (Drizzle client)
export {
  db,
  getDb,
  queryWithFallback,
  getCachedQuery,
  setCachedQuery,
  MOCK_AGENTS,
  schema,
} from './index';

// Re-export schema types
export type {
  ERC8004Service,
  ERC8004Registration,
  PaymentStatus,
  PaymentType,
  ConnectionType,
  EscrowStatus,
  TaskStatus,
} from './schema';

// Re-export Supabase client and helpers
export {
  supabase,
  getAgents,
  getAgentByHandle,
  createAgent,
  updateAgent,
  getUserByWallet,
  createUser,
  getAgentConnections,
  createAgentConnection,
  deleteAgentConnection,
  getPayments,
  createPayment,
  updatePaymentStatus,
  createFeedEvent,
  getFeedEvents,
} from './supabase';

// Convenience type exports for frontend
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type Agent = InferSelectModel<typeof schema.agents>;
export type NewAgent = InferInsertModel<typeof schema.agents>;

export type AgentStats = InferSelectModel<typeof schema.agentStats>;
export type Skill = InferSelectModel<typeof schema.skills>;
export type Review = InferSelectModel<typeof schema.reviews>;
export type Follow = InferSelectModel<typeof schema.follows>;
export type FeedEvent = InferSelectModel<typeof schema.feedEvents>;
export type Badge = InferSelectModel<typeof schema.badges>;
export type ApiKey = InferSelectModel<typeof schema.apiKeys>;
export type Pairing = InferSelectModel<typeof schema.pairings>;
export type Payment = InferSelectModel<typeof schema.payments>;
export type AgentConnection = InferSelectModel<typeof schema.agentConnections>;
export type Task = InferSelectModel<typeof schema.tasks>;

// Agent with relations (common query shape)
export type AgentWithRelations = Agent & {
  owner: Pick<User, 'id' | 'handle' | 'name' | 'avatarUrl'>;
  stats: AgentStats | null;
  skills?: Skill[];
  reviews?: Review[];
};

// Re-export table references for advanced queries
export const tables = {
  users: schema.users,
  agents: schema.agents,
  agentStats: schema.agentStats,
  skills: schema.skills,
  follows: schema.follows,
  reviews: schema.reviews,
  feedEvents: schema.feedEvents,
  badges: schema.badges,
  apiKeys: schema.apiKeys,
  pairings: schema.pairings,
  payments: schema.payments,
  agentConnections: schema.agentConnections,
} as const;
