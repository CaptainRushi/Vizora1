# COPY-PASTE FIX FOR DRIZZLE PARSER

## Step 1: Open the file
Open: `server/parser.ts`

## Step 2: Find line 559
Look for this line:
```typescript
    try {
```

## Step 3: Delete lines 560-611
Delete everything from line 560 to line 611 (the entire matchAll section)

## Step 4: Paste this code right after line 559 (after `try {`)

```typescript
        console.log('[parseDrizzle] Input length:', drizzle.length);
        
        const lines = drizzle.split('\n');
        let currentTable: string | null = null;
        let braceDepth = 0;
        let inTable = false;
        
        for (const line of lines) {
            // Check for table start
            const tableMatch = line.match(/export\s+const\s+\w+\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{/);
            if (tableMatch) {
                currentTable = tableMatch[1];
                inTable = true;
                braceDepth = 1;
                result.schema.tables[currentTable] = {
                    columns: {},
                    indexes: [],
                    relations: []
                };
                console.log(`[parseDrizzle] Found table: ${currentTable}`);
                continue;
            }
            
            if (inTable && currentTable) {
                // Count braces
                for (const char of line) {
                    if (char === '{') braceDepth++;
                    if (char === '}') braceDepth--;
                }
                
                if (braceDepth > 0) {
                    // Parse column
                    const trimmed = line.trim();
                    const colMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)\s*\(/);
                    
                    if (colMatch) {
                        const colName = colMatch[1];
                        const colType = colMatch[2];
                        
                        console.log(`[parseDrizzle] Column: ${currentTable}.${colName}`);
                        
                        let sqlType = 'text';
                        if (colType === 'uuid') sqlType = 'uuid';
                        else if (colType === 'integer' || colType === 'int') sqlType = 'integer';
                        else if (colType === 'text' || colType === 'varchar') sqlType = 'text';
                        else if (colType === 'timestamp') sqlType = 'timestamp';
                        else if (colType === 'boolean') sqlType = 'boolean';
                        else if (colType === 'serial') sqlType = 'serial';
                        
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
                    inTable = false;
                    currentTable = null;
                }
            }
        }
        
        const foundTables = Object.keys(result.schema.tables).length > 0;
```

## Step 5: Keep the rest
After line 611, you should see:
```typescript
        if (!foundTables) {
```

**KEEP EVERYTHING FROM THERE TO THE END OF THE FUNCTION** - don't delete that part!

## Step 6: Save
Save the file. The server will auto-reload.

## Step 7: Test
Try pasting your Drizzle schema again!

---

## What you're replacing:

**DELETE THIS (lines 560-611):**
```typescript
        // Match: export const tableName = pgTable("tableName", { ... });
        const tableMatches = drizzle.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{([\s\S]*?)\}\s*\)/g);
        
        let foundTables = false;
        for (const match of tableMatches) {
            // ... all this code ...
        }
```

**WITH THE CODE FROM STEP 4 ABOVE**
