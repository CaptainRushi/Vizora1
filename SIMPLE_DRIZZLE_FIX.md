## Quick Manual Fix for Drizzle Parser

**Problem**: Line 561 in `server/parser.ts` has a regex that doesn't work for multi-line Drizzle schemas.

**Current (BROKEN) Line 561:**
```typescript
const tableMatches = drizzle.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{([\s\S]*?)\}\s*\)/g);
```

**Replace with (WORKING):**
```typescript
// Don't use matchAll - use line-by-line parsing instead
const lines = drizzle.split('\n');
let currentTable: string | null = null;
let braceDepth = 0;
let inTable = false;

for (const line of lines) {
    const tableMatch = line.match(/export\s+const\s+\w+\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{/);
    if (tableMatch) {
        currentTable = tableMatch[1];
        inTable = true;
        braceDepth = 1;
        result.schema.tables[currentTable] = { columns: {}, indexes: [], relations: [] };
        continue;
    }
    
    if (inTable && currentTable) {
        for (const char of line) {
            if (char === '{') braceDepth++;
            if (char === '}') braceDepth--;
        }
        
        if (braceDepth > 0) {
            const colMatch = line.trim().match(/^(\w+)\s*:\s*(\w+)\s*\(/);
            if (colMatch) {
                const [, colName, colType] = colMatch;
                let sqlType = 'text';
                if (colType === 'uuid') sqlType = 'uuid';
                else if (colType === 'integer') sqlType = 'integer';
                else if (colType === 'timestamp') sqlType = 'timestamp';
                else if (colType === 'boolean') sqlType = 'boolean';
                
                result.schema.tables[currentTable].columns[colName] = {
                    type: sqlType,
                    nullable: !line.includes('.notNull()') && !line.includes('.primaryKey()'),
                    primary: line.includes('.primaryKey()'),
                    unique: line.includes('.unique()')
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

**Then delete lines 564-611** (the old for loop) and keep the rest of the function.

This will make Drizzle parsing actually work!
