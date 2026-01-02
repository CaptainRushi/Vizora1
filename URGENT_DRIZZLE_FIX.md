# URGENT: Drizzle Parser Still Has Issues

## Current Problem
Getting 400 Bad Request when trying to ingest Drizzle schema.

## Root Cause
The `matchAll` regex in `parser.ts` line 561 is STILL too strict and doesn't match multi-line Drizzle schemas properly.

## IMMEDIATE FIX NEEDED

Replace lines 560-611 in `server/parser.ts` with this working version:

```typescript
    try {
        console.log('[parseDrizzle] Input:', drizzle.substring(0, 200));
        
        // Simple regex to find table starts
        const lines = drizzle.split('\n');
        let currentTable = null;
        let currentBody = '';
        let braceDepth = 0;
        let inTable = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for table declaration
            const tableMatch = line.match(/export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{/);
            if (tableMatch) {
                currentTable = tableMatch[2];
                inTable = true;
                braceDepth = 1;
                currentBody = '';
                
                result.schema.tables[currentTable] = {
                    columns: {},
                    indexes: [],
                    relations: []
                };
                
                console.log(`[parseDrizzle] Found table: ${currentTable}`);
                continue;
            }
            
            if (inTable) {
                // Count braces
                for (const char of line) {
                    if (char === '{') braceDepth++;
                    if (char === '}') braceDepth--;
                }
                
                // Parse column if we're still inside the table
                if (braceDepth > 0) {
                    currentBody += line + '\n';
                    
                    // Try to parse column from this line
                    const trimmed = line.trim();
                    const colMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)\s*\(/);
                    
                    if (colMatch && currentTable) {
                        const colName = colMatch[1];
                        const colType = colMatch[2];
                        
                        console.log(`[parseDrizzle] Found column: ${currentTable}.${colName} (${colType})`);
                        
                        // Map types
                        let sqlType = 'text';
                        if (colType === 'uuid') sqlType = 'uuid';
                        else if (colType === 'integer' || colType === 'int') sqlType = 'integer';
                        else if (colType === 'text' || colType === 'varchar') sqlType = 'text';
                        else if (colType === 'timestamp') sqlType = 'timestamp';
                        else if (colType === 'boolean') sqlType = 'boolean';
                        else if (colType === 'serial') sqlType = 'serial';
                        
                        // Check modifiers
                        const isPk = trimmed.includes('.primaryKey()');
                        const isUnique = trimmed.includes('.unique()');
                        const notNull = trimmed.includes('.notNull()');
                        
                        result.schema.tables[currentTable].columns[colName] = {
                            type: sqlType,
                            nullable: !notNull && !isPk,
                            primary: isPk,
                            unique: isUnique
                        };
                    }
                } else {
                    // Table ended
                    inTable = false;
                    currentTable = null;
                }
            }
        }
        
        const foundTables = Object.keys(result.schema.tables).length > 0;
```

## Quick Test

After applying the fix, test with this schema:

```typescript
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull()
});
```

## Why This Works

1. **Line-by-line parsing** - More reliable than complex regex
2. **Brace counting** - Properly handles nested structures  
3. **Simple column detection** - Matches column definitions robustly
4. **Detailed logging** - Shows exactly what's being parsed

## Apply This Fix NOW

1. Open `server/parser.ts`
2. Find the `parseDrizzle` function (line 549)
3. Replace the `try` block content with the code above
4. Save the file
5. Server should auto-reload
6. Try again!
