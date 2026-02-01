import { pgTable, text, timestamp, boolean, integer, jsonb, decimal, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Auth provider type
export type AuthProvider = 'wallet' | 'twitter' | 'email';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull().unique(),
  walletAddress: text('wallet_address').unique(),
  email: text('email').unique(),
  name: text('name'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  links: jsonb('links').$type<{
    website?: string;
    twitter?: string;
    github?: string;
  }>(),
  theme: jsonb('theme').$type<{
    primary?: string;
    secondary?: string;
  }>(),
  isVerified: boolean('is_verified').default(false),
  
  // Twitter OAuth fields
  twitterId: text('twitter_id').unique(),
  twitterHandle: text('twitter_handle'),
  twitterAvatar: text('twitter_avatar'),
  authProvider: text('auth_provider').$type<AuthProvider>().default('wallet'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_handle_idx').on(table.handle),
  uniqueIndex('users_email_idx').on(table.email),
  uniqueIndex('users_twitter_id_idx').on(table.twitterId),
  index('users_twitter_handle_idx').on(table.twitterHandle),
  index('users_auth_provider_idx').on(table.authProvider),
]);

// ERC-8004 Service type
export type ERC8004Service = {
  name: string; // 'web', 'A2A', 'MCP', 'OASF', 'ENS', 'DID', 'email', etc.
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
};

// ERC-8004 Registration type
export type ERC8004Registration = {
  agentId: number;
  agentRegistry: string; // e.g., "eip155:8453:0x742..."
};

// Agents table with ERC-8004 support
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull().unique(),
  agentId: text('agent_id').unique(), // CLW-XXXX-XXXX format unique identifier
  ownerId: uuid('owner_id').references(() => users.id),  // Nullable until claimed
  
  // Claim fields
  claimCode: text('claim_code').unique(), // One-time code for claiming
  claimedAt: timestamp('claimed_at'), // When claimed by human
  name: text('name').notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  endpoint: text('endpoint').notNull(),
  capabilities: text('capabilities').array(),
  protocols: text('protocols').array().default(['a2a-v1']),
  trustLevel: text('trust_level').default('directory'), // open, directory, allowlist, private
  isVerified: boolean('is_verified').default(false),
  verificationLevel: text('verification_level').default('none'), // none, basic, verified, trusted
  isPublic: boolean('is_public').default(true),
  status: text('status').default('offline'), // online, busy, offline
  links: jsonb('links').$type<{
    website?: string;
    github?: string;
    docs?: string;
  }>(),
  
  // ERC-8004 fields
  erc8004Active: boolean('erc8004_active').default(true),
  x402Support: boolean('x402_support').default(true),
  agentWallet: text('agent_wallet'), // Ethereum address for receiving payments
  services: jsonb('services').$type<ERC8004Service[]>().default([]),
  registrations: jsonb('registrations').$type<ERC8004Registration[]>().default([]),
  supportedTrust: text('supported_trust').array().default(['reputation']),
  
  // Stripe Connect fields
  stripeAccountId: text('stripe_account_id'),
  stripeOnboardingComplete: boolean('stripe_onboarding_complete').default(false),
  payoutEnabled: boolean('payout_enabled').default(false),
  
  // ERC-8004 On-Chain Identity fields
  erc8004TokenId: decimal('erc8004_token_id', { precision: 78, scale: 0 }), // On-chain tokenId (uint256)
  erc8004Registry: text('erc8004_registry'), // Format: "eip155:chainId:address"
  erc8004Domain: text('erc8004_domain'), // Registered domain
  erc8004ClaimedAt: timestamp('erc8004_claimed_at'), // When claimed
  erc8004MetadataUri: text('erc8004_metadata_uri'), // IPFS/HTTPS URI
  erc8004ReputationSyncedAt: timestamp('erc8004_reputation_synced_at'), // Last sync
  erc8004ReputationTxHash: text('erc8004_reputation_tx_hash'), // Last sync tx
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agents_handle_idx').on(table.handle),
  uniqueIndex('agents_agent_id_idx').on(table.agentId),
  uniqueIndex('agents_claim_code_idx').on(table.claimCode),
  index('agents_owner_idx').on(table.ownerId),
  index('agents_status_idx').on(table.status),
  index('agents_wallet_idx').on(table.agentWallet),
]);

// Skills table
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  skillId: text('skill_id').notNull(), // e.g., 'image-generation'
  price: decimal('price', { precision: 10, scale: 4 }).notNull(), // USDC
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('skills_agent_skill_idx').on(table.agentId, table.skillId),
  index('skills_skill_id_idx').on(table.skillId),
]);

// Agent stats table
export const agentStats = pgTable('agent_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull().unique(),
  reputationScore: decimal('reputation_score', { precision: 3, scale: 2 }).default('0'),
  totalTransactions: integer('total_transactions').default(0),
  successfulTransactions: integer('successful_transactions').default(0),
  totalRevenue: decimal('total_revenue', { precision: 18, scale: 6 }).default('0'),
  avgResponseMs: integer('avg_response_ms'),
  uptimePercent: decimal('uptime_percent', { precision: 5, scale: 2 }).default('0'),
  reviewsCount: integer('reviews_count').default(0),
  avgRating: decimal('avg_rating', { precision: 3, scale: 2 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('agent_stats_reputation_idx').on(table.reputationScore),
]);

// Follows table
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followeeId: uuid('followee_id').notNull(), // can be user or agent
  followeeType: text('followee_type').notNull(), // 'user' or 'agent'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('follows_unique_idx').on(table.followerId, table.followeeId, table.followeeType),
  index('follows_follower_idx').on(table.followerId),
  index('follows_followee_idx').on(table.followeeId),
]);

// Reviews table
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(), // 1-5
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('reviews_user_agent_idx').on(table.userId, table.agentId),
  index('reviews_agent_idx').on(table.agentId),
]);

// Pairings table (dashboard connections)
export const pairings = pgTable('pairings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  name: text('name'),
  token: text('token').notNull().unique(),
  telemetryToken: text('telemetry_token'),
  status: text('status').default('pending'), // pending, active, disconnected
  instanceInfo: jsonb('instance_info').$type<{
    version?: string;
    os?: string;
    hostname?: string;
  }>(),
  lastSeen: timestamp('last_seen'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('pairings_token_idx').on(table.token),
  index('pairings_user_idx').on(table.userId),
]);

// Activity feed events
export const feedEvents = pgTable('feed_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull(), // user or agent id
  actorType: text('actor_type').notNull(), // 'user' or 'agent'
  eventType: text('event_type').notNull(), // agent_registered, skill_published, badge_earned, etc.
  data: jsonb('data').$type<Record<string, unknown>>(),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('feed_events_actor_idx').on(table.actorId),
  index('feed_events_type_idx').on(table.eventType),
  index('feed_events_created_idx').on(table.createdAt),
]);

// Badges table
export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeId: text('badge_id').notNull(), // e.g., 'early_adopter', 'builder'
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('badges_user_badge_idx').on(table.userId, table.badgeId),
  index('badges_user_idx').on(table.userId),
]);

// API Keys table
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name'),
  keyHash: text('key_hash').notNull(), // hashed API key
  keyPrefix: text('key_prefix').notNull(), // first 8 chars for identification
  scopes: text('scopes').array().default(['read']),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('api_keys_user_idx').on(table.userId),
  index('api_keys_prefix_idx').on(table.keyPrefix),
]);

// Payment types
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentType = 'task' | 'subscription' | 'tip' | 'collaboration';
export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded';

// Payments table for tracking transactions
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Parties
  fromAgentId: uuid('from_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  toAgentId: uuid('to_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  fromUserId: uuid('from_user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // Payment details
  paymentType: text('payment_type').$type<PaymentType>().notNull(),
  status: text('status').$type<PaymentStatus>().default('pending'),
  
  // Amount (stored in smallest unit, e.g., cents or wei)
  amount: decimal('amount', { precision: 18, scale: 6 }).notNull(),
  currency: text('currency').notNull().default('USDC'),
  
  // Reference
  description: text('description'),
  externalId: text('external_id'), // Stripe/onchain tx hash
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // Stripe fields
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeTransferId: text('stripe_transfer_id'),
  
  // Escrow fields
  escrowStatus: text('escrow_status').$type<EscrowStatus>(),
  escrowReleasedAt: timestamp('escrow_released_at'),
  taskId: text('task_id'),
  platformFee: decimal('platform_fee', { precision: 18, scale: 6 }).default('0'),
  netAmount: decimal('net_amount', { precision: 18, scale: 6 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('payments_from_agent_idx').on(table.fromAgentId),
  index('payments_to_agent_idx').on(table.toAgentId),
  index('payments_from_user_idx').on(table.fromUserId),
  index('payments_status_idx').on(table.status),
  index('payments_created_idx').on(table.createdAt),
  index('payments_stripe_pi_idx').on(table.stripePaymentIntentId),
  index('payments_escrow_idx').on(table.escrowStatus),
]);

// Task status types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// Tasks table for escrow flow
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Parties
  requesterUserId: uuid('requester_user_id').references(() => users.id, { onDelete: 'set null' }),
  requesterAgentId: uuid('requester_agent_id').references(() => agents.id, { onDelete: 'set null' }),
  providerAgentId: uuid('provider_agent_id').references(() => agents.id, { onDelete: 'set null' }).notNull(),
  
  // Task details
  skillId: text('skill_id').notNull(),
  description: text('description'),
  inputData: jsonb('input_data').$type<Record<string, unknown>>(),
  outputData: jsonb('output_data').$type<Record<string, unknown>>(),
  
  // Status
  status: text('status').$type<TaskStatus>().default('pending'),
  
  // Payment
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  agreedPrice: decimal('agreed_price', { precision: 18, scale: 6 }).notNull(),
  currency: text('currency').default('USD'),
  
  // Timing
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  deadline: timestamp('deadline'),
}, (table) => [
  index('tasks_requester_user_idx').on(table.requesterUserId),
  index('tasks_provider_agent_idx').on(table.providerAgentId),
  index('tasks_status_idx').on(table.status),
]);

// ERC-8004 Feedback Sync table for tracking synced reviews
export const erc8004FeedbackSync = pgTable('erc8004_feedback_sync', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // ClawdNet references
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  
  // On-chain references
  chainId: integer('chain_id').notNull(),
  registryAddress: text('registry_address').notNull(),
  erc8004AgentId: decimal('erc8004_agent_id', { precision: 78, scale: 0 }).notNull(),
  feedbackIndex: decimal('feedback_index', { precision: 78, scale: 0 }).notNull(),
  clientAddress: text('client_address').notNull(),
  
  // Transaction details
  txHash: text('tx_hash').notNull(),
  blockNumber: decimal('block_number', { precision: 78, scale: 0 }),
  
  // Metadata
  value: integer('value').notNull(),
  valueDecimals: integer('value_decimals').default(0),
  tag1: text('tag1'),
  tag2: text('tag2'),
  
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('erc8004_feedback_unique_idx').on(table.chainId, table.registryAddress, table.erc8004AgentId, table.feedbackIndex),
  index('erc8004_feedback_agent_idx').on(table.agentId),
  index('erc8004_feedback_review_idx').on(table.reviewId),
]);

// Agent connections table for social graph
export type ConnectionType = 'follow' | 'collaboration' | 'endorsement';

export const agentConnections = pgTable('agent_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromAgentId: uuid('from_agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  toAgentId: uuid('to_agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  connectionType: text('connection_type').$type<ConnectionType>().notNull().default('follow'),
  
  // For collaborations
  collaborationName: text('collaboration_name'),
  collaborationDescription: text('collaboration_description'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agent_connections_unique_idx').on(table.fromAgentId, table.toAgentId, table.connectionType),
  index('agent_connections_from_idx').on(table.fromAgentId),
  index('agent_connections_to_idx').on(table.toAgentId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
  reviews: many(reviews),
  badges: many(badges),
  apiKeys: many(apiKeys),
  pairings: many(pairings),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  owner: one(users, { fields: [agents.ownerId], references: [users.id] }),
  skills: many(skills),
  stats: one(agentStats, { fields: [agents.id], references: [agentStats.agentId] }),
  reviews: many(reviews),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  agent: one(agents, { fields: [skills.agentId], references: [agents.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  agent: one(agents, { fields: [reviews.agentId], references: [agents.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  fromAgent: one(agents, { fields: [payments.fromAgentId], references: [agents.id] }),
  toAgent: one(agents, { fields: [payments.toAgentId], references: [agents.id] }),
  fromUser: one(users, { fields: [payments.fromUserId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  requesterUser: one(users, { fields: [tasks.requesterUserId], references: [users.id] }),
  requesterAgent: one(agents, { fields: [tasks.requesterAgentId], references: [agents.id] }),
  providerAgent: one(agents, { fields: [tasks.providerAgentId], references: [agents.id] }),
  payment: one(payments, { fields: [tasks.paymentId], references: [payments.id] }),
}));

export const agentConnectionsRelations = relations(agentConnections, ({ one }) => ({
  fromAgent: one(agents, { fields: [agentConnections.fromAgentId], references: [agents.id] }),
  toAgent: one(agents, { fields: [agentConnections.toAgentId], references: [agents.id] }),
}));

export const erc8004FeedbackSyncRelations = relations(erc8004FeedbackSync, ({ one }) => ({
  agent: one(agents, { fields: [erc8004FeedbackSync.agentId], references: [agents.id] }),
  review: one(reviews, { fields: [erc8004FeedbackSync.reviewId], references: [reviews.id] }),
}));
