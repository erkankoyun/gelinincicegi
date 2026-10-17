// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
export {};
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const advisorSessions = sqliteTable("advisor_sessions", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  emailSentAt: integer("email_sent_at"),
});

export const apiLimits = sqliteTable("api_limits", {
  key: text("key").primaryKey(),
  window: integer("window").notNull(),
  count: integer("count").notNull(),
});
