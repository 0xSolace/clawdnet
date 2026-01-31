import { pgTable, index, uuid, text, jsonb, timestamp, uniqueIndex, foreignKey, unique, boolean, numeric, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const feedEvents = pgTable("feed_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorId: uuid("actor_id").notNull(),
	actorType: text("actor_type").notNull(),
	eventType: text("event_type").notNull(),
	data: jsonb(),
	message: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("feed_events_actor_idx").using("btree", table.actorId.asc().nullsLast().op("uuid_ops")),
	index("feed_events_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("feed_events_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
]);

export const agents = pgTable("agents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	handle: text().notNull(),
	ownerId: uuid("owner_id").notNull(),
	name: text().notNull(),
	description: text(),
	avatarUrl: text("avatar_url"),
	endpoint: text().notNull(),
	capabilities: text().array(),
	protocols: text().array().default(["a2a-v1"]),
	trustLevel: text("trust_level").default('directory'),
	isVerified: boolean("is_verified").default(false),
	isPublic: boolean("is_public").default(true),
	status: text().default('offline'),
	links: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("agents_handle_idx").using("btree", table.handle.asc().nullsLast().op("text_ops")),
	index("agents_owner_idx").using("btree", table.ownerId.asc().nullsLast().op("uuid_ops")),
	index("agents_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "agents_owner_id_users_id_fk"
		}),
	unique("agents_handle_unique").on(table.handle),
]);

export const agentStats = pgTable("agent_stats", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	reputationScore: numeric("reputation_score", { precision: 3, scale:  2 }).default('0'),
	totalTransactions: integer("total_transactions").default(0),
	successfulTransactions: integer("successful_transactions").default(0),
	totalRevenue: numeric("total_revenue", { precision: 18, scale:  6 }).default('0'),
	avgResponseMs: integer("avg_response_ms"),
	uptimePercent: numeric("uptime_percent", { precision: 5, scale:  2 }).default('0'),
	reviewsCount: integer("reviews_count").default(0),
	avgRating: numeric("avg_rating", { precision: 3, scale:  2 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("agent_stats_reputation_idx").using("btree", table.reputationScore.asc().nullsLast().op("numeric_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "agent_stats_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	unique("agent_stats_agent_id_unique").on(table.agentId),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	handle: text().notNull(),
	email: text().notNull(),
	name: text(),
	bio: text(),
	avatarUrl: text("avatar_url"),
	links: jsonb(),
	theme: jsonb(),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("users_handle_idx").using("btree", table.handle.asc().nullsLast().op("text_ops")),
	unique("users_handle_unique").on(table.handle),
	unique("users_email_unique").on(table.email),
]);

export const apiKeys = pgTable("api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text(),
	keyHash: text("key_hash").notNull(),
	keyPrefix: text("key_prefix").notNull(),
	scopes: text().array().default(["read"]),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("api_keys_prefix_idx").using("btree", table.keyPrefix.asc().nullsLast().op("text_ops")),
	index("api_keys_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_keys_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const badges = pgTable("badges", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	badgeId: text("badge_id").notNull(),
	earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("badges_user_badge_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.badgeId.asc().nullsLast().op("text_ops")),
	index("badges_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "badges_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const follows = pgTable("follows", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	followerId: uuid("follower_id").notNull(),
	followeeId: uuid("followee_id").notNull(),
	followeeType: text("followee_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("follows_followee_idx").using("btree", table.followeeId.asc().nullsLast().op("uuid_ops")),
	index("follows_follower_idx").using("btree", table.followerId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("follows_unique_idx").using("btree", table.followerId.asc().nullsLast().op("text_ops"), table.followeeId.asc().nullsLast().op("uuid_ops"), table.followeeType.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "follows_follower_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const pairings = pgTable("pairings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	agentId: uuid("agent_id"),
	name: text(),
	token: text().notNull(),
	telemetryToken: text("telemetry_token"),
	status: text().default('pending'),
	instanceInfo: jsonb("instance_info"),
	lastSeen: timestamp("last_seen", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("pairings_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("pairings_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "pairings_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "pairings_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("pairings_token_unique").on(table.token),
]);

export const reviews = pgTable("reviews", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	userId: uuid("user_id").notNull(),
	rating: integer().notNull(),
	content: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("reviews_agent_idx").using("btree", table.agentId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("reviews_user_agent_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.agentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "reviews_agent_id_agents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reviews_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const skills = pgTable("skills", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull(),
	skillId: text("skill_id").notNull(),
	price: numeric({ precision: 10, scale:  4 }).notNull(),
	metadata: jsonb(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("skills_agent_skill_idx").using("btree", table.agentId.asc().nullsLast().op("text_ops"), table.skillId.asc().nullsLast().op("text_ops")),
	index("skills_skill_id_idx").using("btree", table.skillId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agents.id],
			name: "skills_agent_id_agents_id_fk"
		}).onDelete("cascade"),
]);
