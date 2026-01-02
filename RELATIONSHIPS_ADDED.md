# ✅ Relationship Detection Added!

## What Was Added

I've added **automatic relationship detection** to both Prisma and Drizzle parsers!

### How It Works

The parsers now automatically detect foreign key relationships based on column naming conventions:

#### For Drizzle:
- Columns ending in `_id` (e.g., `user_id`, `post_id`)
- Columns ending in `Id` (e.g., `userId`, `postId`)
- Automatically tries plural forms (e.g., `user_id` → `users` table)

#### For Prisma:
- Columns ending in `Id` (e.g., `userId`, `postId`)
- Converts to lowercase to match table names (e.g., `userId` → `user` table)

### Example

**Drizzle Schema:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name")
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),  // ← Detected as FK to users.id
  title: text("title")
});
```

**Prisma Schema:**
```prisma
model User {
  id Int @id
  name String
}

model Post {
  id Int @id
  userId Int  // ← Detected as FK to user.id
  title String
}
```

## What This Means

✅ **ER Diagrams will now show connections!**
- Lines connecting related tables
- Foreign key relationships visualized
- Proper many-to-one relationships

## Testing

1. **Restart the server** (since you're using `npm start`)
   - Press `Ctrl+C` in the server terminal
   - Run `npm start` again

2. **Paste a schema with relationships:**

**Drizzle Example:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull()
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull()
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey(),
  post_id: uuid("post_id").notNull(),
  user_id: uuid("user_id").notNull(),
  content: text("content").notNull()
});
```

3. **Check the ER diagram** - you should see:
   - `posts.user_id` → `users.id`
   - `comments.post_id` → `posts.id`
   - `comments.user_id` → `users.id`

## Logs to Look For

When you paste a schema, you'll see:
```
[parseDrizzle] Inferring relationships...
[parseDrizzle] Found relationship: posts.user_id -> users.id
[parseDrizzle] Found relationship: comments.post_id -> posts.id
[parseDrizzle] Found relationship: comments.user_id -> users.id
```

## 🎉 Result

Your ER diagrams will now show **proper connections** between tables! 🔗
