# 🔍 Troubleshooting: Relationships Not Showing in ER Diagram

## The Problem
You've pasted Drizzle/Prisma schemas but the connecting lines between tables aren't showing in the ER diagram.

## Why This Happens
The relationship detection code was added, but you need to **re-ingest the schema** for it to take effect.

## ✅ Solution (Step by Step)

### Step 1: Restart the Server
Since you're using `npm start` (not `npm run dev`):

1. Go to the terminal running the server
2. Press `Ctrl + C`
3. Run `npm start` again
4. Wait for "Server running on http://localhost:3001"

### Step 2: Re-Paste Your Schema
The old schema in the database doesn't have relationships. You need to paste it again:

1. Go to http://localhost:5173/workspace/[your-project-id]/schema-input
2. **Paste your schema again** (even if it's the same one)
3. Click "Parse & Generate"

### Step 3: Check Server Logs
You should see logs like:
```
[parseDrizzle] ===== STARTING PARSE =====
[parseDrizzle] Input length: 300
[parseDrizzle] Found table: users
[parseDrizzle] Column: users.id
[parseDrizzle] Found table: posts
[parseDrizzle] Column: posts.user_id
[parseDrizzle] Inferring relationships...
[parseDrizzle] Found relationship: posts.user_id -> users.id
```

### Step 4: View ER Diagram
1. Go to http://localhost:5173/workspace/[your-project-id]/er-diagram
2. You should now see connecting lines!

## 📝 Test Schema (Copy This)

### For Drizzle:
```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull()
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content")
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey(),
  post_id: uuid("post_id").notNull(),
  user_id: uuid("user_id").notNull(),
  content: text("content").notNull()
});
```

### For Prisma:
```prisma
model User {
  id Int @id
  email String @unique
  name String
}

model Post {
  id Int @id
  userId Int
  title String
  content String?
}

model Comment {
  id Int @id
  postId Int
  userId Int
  content String
}
```

## 🔍 How to Verify It's Working

### Check 1: Server Logs
After pasting, you should see:
- `[parseDrizzle] Found relationship: posts.user_id -> users.id`
- `[parseDrizzle] Found relationship: comments.post_id -> posts.id`
- `[parseDrizzle] Found relationship: comments.user_id -> users.id`

### Check 2: Database
The `schema_versions` table should have a new version with `relations` in the `normalized_schema` JSON.

### Check 3: ER Diagram
You should see:
- Blue lines connecting tables
- Lines from `posts` to `users`
- Lines from `comments` to `posts` and `users`

## ⚠️ Common Issues

### Issue 1: "No relationships detected"
**Cause**: Column names don't follow the naming convention.

**Solution**: Make sure foreign key columns end with `_id` (Drizzle) or `Id` (Prisma):
- ✅ `user_id`, `post_id`, `userId`, `postId`
- ❌ `user`, `post`, `author`, `parent`

### Issue 2: "Lines not showing"
**Cause**: Old schema still in database.

**Solution**: Re-paste the schema to create a new version with relationships.

### Issue 3: "Server not restarting"
**Cause**: Using `npm start` instead of `npm run dev`.

**Solution**: Manually restart with `Ctrl+C` then `npm start`.

## 🎯 Quick Checklist

- [ ] Server restarted
- [ ] Schema re-pasted (new version created)
- [ ] Server logs show "Found relationship"
- [ ] ER diagram refreshed
- [ ] Column names end with `_id` or `Id`

## 💡 Pro Tip

Use `npm run dev` instead of `npm start` for automatic server reloading when you edit code!

```bash
# Stop current server
Ctrl + C

# Start in dev mode (auto-reload)
npm run dev
```

---

**After following these steps, your ER diagram should show all the relationship lines!** 🎉
