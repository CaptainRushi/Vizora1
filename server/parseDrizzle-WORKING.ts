// WORKING parseDrizzle function - REPLACE lines 549-633 in parser.ts with this

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
        console.log('[parseDrizzle] Input length:', drizzle.length);

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
                result.schema.tables[currentTable] = {
                    columns: {},
                    indexes: [],
                    relations: []
                };
                console.log(`[parseDrizzle] Found table: ${currentTable}`);
                continue;
            }

            if (inTable && currentTable) {
                for (const char of line) {
                    if (char === '{') braceDepth++;
                    if (char === '}') braceDepth--;
                }

                if (braceDepth > 0) {
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
