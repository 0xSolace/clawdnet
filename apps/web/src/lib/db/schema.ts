import { pgTable, text, timestamp, boolean, integer, jsonb, decimal, uuid, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull().unique(),
  email: text('email').notNull().unique(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_handle_idx').on(table.handle),
  uniqueIndex('users_email_idx').on(table.email),
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
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  endpoint: text('endpoint').notNull(),
  capabilities: text('capabilities').array(),
  protocols: text('protocols').array().default(['a2a-v1']),
  trustLevel: text('trust_level').default('directory'), // open, directory, allowlist, private
  isVerified: boolean('is_verified').default(false),
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
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agents_handle_idx').on(table.handle),
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
