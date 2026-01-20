import { NormalizedSchema, ParsingResult } from './types.js';

export function parseDrizzle(drizzle: string): ParsingResult {
    const result: ParsingResult = {
        status: 'success',
        input_type: 'prisma', // Note: input_type definition in types.ts says 'prisma' | 'sql' | 'unknown', maybe add 'drizzle'? But for compatibility I keep existing
        errors: [],
        warnings: [],
        schema: { tables: {} },
        stats: { table_count: 0, column_count: 0, relation_count: 0 }
    };

    try {
        console.log('[parseDrizzle] ===== STARTING PARSE =====');
        console.log('[parseDrizzle] Input length:', drizzle.length);
        console.log('[parseDrizzle] First 200 chars:', drizzle.substring(0, 200));

        const lines = drizzle.split('\n');
        console.log('[parseDrizzle] Total lines:', lines.length);
        let currentTable: string | null = null;
        let braceDepth = 0;
        let inTable = false;

        for (const line of lines) {
            const tableMatch = line.match(/export\s+const\s+\w+\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{/);
            if (tableMatch) {
                currentTable = tableMatch[1] || null;
                inTable = true;
                braceDepth = 1;
                if (currentTable) {
                    result.schema.tables[currentTable] = {
                        columns: {},
                        indexes: [],
                        relations: []
                    };
                    console.log(`[parseDrizzle] Found table: ${currentTable}`);
                }
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

                        if (currentTable && colName) {
                            const table = result.schema.tables[currentTable];
                            if (table) {
                                table.columns[colName] = {
                                    type: sqlType,
                                    nullable: !notNull && !isPk,
                                    primary: isPk,
                                    unique: isUnique
                                };
                            }
                        }
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

        // Infer relationships from column names (e.g., user_id -> users table)
        console.log('[parseDrizzle] Inferring relationships...');
        for (const [tableName, table] of Object.entries(result.schema.tables)) {
            for (const [colName, col] of Object.entries(table.columns)) {
                // Check if column name suggests a foreign key (ends with _id or Id)
                if (colName.endsWith('_id') || (colName.endsWith('Id') && colName !== 'id')) {
                    // Extract referenced table name
                    let refTable = colName.replace(/_id$/, '').replace(/Id$/, '');

                    // Try plural form (e.g., user_id -> users)
                    const pluralRef = refTable + 's';
                    if (result.schema.tables[pluralRef]) {
                        refTable = pluralRef;
                    }

                    // Check if referenced table exists
                    if (result.schema.tables[refTable]) {
                        console.log(`[parseDrizzle] Found relationship: ${tableName}.${colName} -> ${refTable}.id`);
                        col.foreign_key = `${refTable}.id`;
                        table.relations.push({
                            type: 'many_to_one',
                            from: `${tableName}.${colName}`,
                            to: `${refTable}.id`
                        });
                    }
                }
            }
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

export function generateDrizzle(schema: NormalizedSchema): string {
    let drizzle = `import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";\n\n`;

    for (const [tableName, table] of Object.entries(schema.tables)) {
        drizzle += `export const ${tableName} = pgTable("${tableName}", {\n`;

        for (const [colName, col] of Object.entries(table.columns)) {
            let builder = '';
            const type = col.type.toLowerCase();
            if (type === 'uuid') builder = `uuid("${colName}")`;
            else if (type === 'int' || type === 'integer' || type === 'serial') builder = `integer("${colName}")`;
            else if (type === 'text' || type === 'varchar') builder = `text("${colName}")`;
            else if (type === 'timestamp' || type === 'timestamptz') builder = `timestamp("${colName}")`;
            else if (type === 'boolean') builder = `boolean("${colName}")`;
            else builder = `text("${colName}")`;

            if (col.primary) builder += '.primaryKey()';
            if (!col.nullable) builder += '.notNull()';
            if (col.unique && !col.primary) builder += '.unique()';
            if (col.default) {
                if (col.default.toLowerCase().includes('now()')) builder += '.defaultNow()';
            }

            drizzle += `  ${colName}: ${builder},\n`;
        }

        drizzle += '});\n\n';
    }

    return drizzle;
}
