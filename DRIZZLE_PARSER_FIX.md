# Quick Fix for Drizzle Parser

## Problem
The `parseDrizzle` function in `server/parser.ts` uses `matchAll` with a regex that's too strict and doesn't handle multi-line table definitions properly.

## Solution
Replace the `parseDrizzle` function (lines 549-633) in `server/parser.ts` with this improved version:

```typescript
export function parseDrizzle(drizzle: string): ParsingResult {
    const result: ParsingResult = {
        status: 'success',
        input_type: 'prisma',
        errors: [],
        warnings: [],
        schema: { tables: {} },
        stats: { table_count: 0, column_count: 0, relation_count: 0 }
    };

    try {
        // Match table declarations
        const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{/g;
        
        let match;
        let foundTables = false;
        
        while ((match = tableRegex.exec(drizzle)) !== null) {
            const varName = match[1];
            const tableName = match[2];
            const startIndex = match.index + match[0].length;
            
            // Find matching closing brace using brace counting
            let braceCount = 1;
            let endIndex = startIndex;
            
            while (braceCount > 0 && endIndex < drizzle.length) {
                if (drizzle[endIndex] === '{') braceCount++;
                if (drizzle[endIndex] === '}') braceCount--;
                endIndex++;
            }
            
            const body = drizzle.substring(startIndex, endIndex - 1);

            result.schema.tables[tableName] = {
                columns: {},
                indexes: [],
                relations: []
            };

            // Parse columns line by line
            const lines = body.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//')) continue;
                
                // Match: columnName: type("columnName")
                const colMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)\s*\(/);
                if (!colMatch) continue;
                
                const colName = colMatch[1];
                const colType = colMatch[2];
                
                // Map Drizzle types to SQL types
                let sqlType = 'text';
                if (colType === 'uuid') sqlType = 'uuid';
                else if (colType === 'integer' || colType === 'int') sqlType = 'integer';
                else if (colType === 'text' || colType === 'varchar') sqlType = 'text';
                else if (colType === 'timestamp') sqlType = 'timestamp';
                else if (colType === 'boolean') sqlType = 'boolean';
                else if (colType === 'serial') sqlType = 'serial';

                // Check for modifiers
                const isPk = trimmed.includes('.primaryKey()');
                const isUnique = trimmed.includes('.unique()');
                const notNull = trimmed.includes('.notNull()');

                result.schema.tables[tableName].columns[colName] = {
                    type: sqlType,
                    nullable: !notNull && !isPk,
                    primary: isPk,
                    unique: isUnique
                };
            }
            
            foundTables = true;
        }

        if (!foundTables) {
            result.status = 'error';
            result.errors.push("No pgTable definitions found. Expected format: export const tableName = pgTable(\"tableName\", { ... });");
            return result;
        }

        result.stats.table_count = Object.keys(result.schema.tables).length;
        result.stats.column_count = Object.values(result.schema.tables).reduce((acc, t) => acc + Object.keys(t.columns).length, 0);

        if (result.stats.table_count === 0) {
            result.status = 'error';
            result.errors.push("No tables found in Drizzle schema.");
        } else if (result.stats.column_count === 0) {
            result.warnings.push("Tables found but no columns were parsed.");
        }

    } catch (e: any) {
        result.status = 'error';
        result.errors.push("Parser error: " + e.message);
    }

    return result;
}
```

## Key Changes

1. **Changed from `matchAll` to `exec` loop** - Better control over iteration
2. **Added brace counting algorithm** - Properly handles nested braces in table definitions
3. **Line-by-line column parsing** - More robust than complex regex
4. **Better error messages** - Helps users understand what went wrong

## Test Schema

Use this simple schema to test:

```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name")
});
```

## After Applying the Fix

1. Save the file
2. The server should auto-reload (it's running with `npm start`)
3. Try pasting a Drizzle schema again
4. It should now parse successfully!
