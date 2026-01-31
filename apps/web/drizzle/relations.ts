import { relations } from "drizzle-orm/relations";
import { users, agents, agentStats, apiKeys, badges, follows, pairings, reviews, skills } from "./schema";

export const agentsRelations = relations(agents, ({one, many}) => ({
	user: one(users, {
		fields: [agents.ownerId],
		references: [users.id]
	}),
	agentStats: many(agentStats),
	pairings: many(pairings),
	reviews: many(reviews),
	skills: many(skills),
}));

export const usersRelations = relations(users, ({many}) => ({
	agents: many(agents),
	apiKeys: many(apiKeys),
	badges: many(badges),
	follows: many(follows),
	pairings: many(pairings),
	reviews: many(reviews),
}));

export const agentStatsRelations = relations(agentStats, ({one}) => ({
	agent: one(agents, {
		fields: [agentStats.agentId],
		references: [agents.id]
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	user: one(users, {
		fields: [apiKeys.userId],
		references: [users.id]
	}),
}));

export const badgesRelations = relations(badges, ({one}) => ({
	user: one(users, {
		fields: [badges.userId],
		references: [users.id]
	}),
}));

export const followsRelations = relations(follows, ({one}) => ({
	user: one(users, {
		fields: [follows.followerId],
		references: [users.id]
	}),
}));

export const pairingsRelations = relations(pairings, ({one}) => ({
	agent: one(agents, {
		fields: [pairings.agentId],
		references: [agents.id]
	}),
	user: one(users, {
		fields: [pairings.userId],
		references: [users.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	agent: one(agents, {
		fields: [reviews.agentId],
		references: [agents.id]
	}),
	user: one(users, {
		fields: [reviews.userId],
		references: [users.id]
	}),
}));

export const skillsRelations = relations(skills, ({one}) => ({
	agent: one(agents, {
		fields: [skills.agentId],
		references: [agents.id]
	}),
}));