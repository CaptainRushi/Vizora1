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
        console.log('[parseDrizzle] Starting parse...');
        console.log('[parseDrizzle] Input length:', drizzle.length);

        // More flexible regex that handles multiline and various spacing
        const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{/g;

        let match;
        let foundTables = false;

        while ((match = tableRegex.exec(drizzle)) !== null) {
            foundTables = true;
            const varName = match[1];
            const tableName = match[2];
            const startIndex = match.index + match[0].length;

            console.log(`[parseDrizzle] Found table: ${tableName}`);

            // Find the matching closing brace
            let braceCount = 1;
            let endIndex = startIndex;

            while (braceCount > 0 && endIndex < drizzle.length) {
                if (drizzle[endIndex] === '{') braceCount++;
                if (drizzle[endIndex] === '}') braceCount--;
                endIndex++;
            }

            const body = drizzle.substring(startIndex, endIndex - 1);
            console.log(`[parseDrizzle] Table body length: ${body.length}`);

            result.schema.tables[tableName] = {
                columns: {},
                indexes: [],
                relations: []
            };

            // Parse column definitions line by line
            const lines = body.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

                // Match: columnName: type("columnName")
                const colMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)\s*\(/);
                if (!colMatch) continue;

                const colName = colMatch[1];
                const colType = colMatch[2];

                console.log(`[parseDrizzle] Found column: ${tableName}.${colName} (${colType})`);

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
        }

        if (!foundTables) {
            result.status = 'error';
            result.errors.push("No pgTable definitions found. Expected format: export const tableName = pgTable(\"tableName\", { ... });");
            console.log('[parseDrizzle] No tables found');
            return result;
        }

        result.stats.table_count = Object.keys(result.schema.tables).length;
        result.stats.column_count = Object.values(result.schema.tables).reduce((acc, t) => acc + Object.keys(t.columns).length, 0);

        console.log(`[parseDrizzle] Stats: ${result.stats.table_count} tables, ${result.stats.column_count} columns`);

        if (result.stats.table_count === 0) {
            result.status = 'error';
            result.errors.push("No tables found in Drizzle schema.");
        } else if (result.stats.column_count === 0) {
            result.warnings.push("Tables found but no columns were parsed. Check your column definitions.");
        }

    } catch (e: any) {
        result.status = 'error';
        result.errors.push("Parser error: " + e.message);
        console.error('[parseDrizzle] Error:', e);
    }

    return result;
}
