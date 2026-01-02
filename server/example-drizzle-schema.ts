// Example Drizzle Schema for Vizora
// This demonstrates the supported Drizzle syntax for schema ingestion

import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

// Users Table
export const users = pgTable("users", {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    created_at: timestamp("created_at").defaultNow(),
    is_active: boolean("is_active").notNull()
});

// Posts Table
export const posts = pgTable("posts", {
    id: uuid("id").primaryKey(),
    title: text("title").notNull(),
    content: text("content"),
    author_id: uuid("author_id").notNull(),
    published: boolean("published").notNull(),
    created_at: timestamp("created_at").defaultNow()
});

// Comments Table
export const comments = pgTable("comments", {
    id: uuid("id").primaryKey(),
    post_id: uuid("post_id").notNull(),
    user_id: uuid("user_id").notNull(),
    content: text("content").notNull(),
    created_at: timestamp("created_at").defaultNow()
});

// Categories Table
export const categories = pgTable("categories", {
    id: integer("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description")
});

// Post Categories Junction Table
export const post_categories = pgTable("post_categories", {
    post_id: uuid("post_id").notNull(),
    category_id: integer("category_id").notNull()
});
