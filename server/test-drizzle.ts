// Test Drizzle Schema
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name")
});
