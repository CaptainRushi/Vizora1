import { NormalizedSchema, ParsingResult, NormalizedRelation, NormalizedColumn } from './types.js';
import { cleanSql, splitByComma } from './utils.js';

export function parseSqlDeterministc(rawSchema: string): ParsingResult {
    const result: ParsingResult = {
        status: 'success',
        input_type: 'sql',
        errors: [],
        warnings: [],
        schema: { tables: {} },
        stats: { table_count: 0, column_count: 0, relation_count: 0 }
    };

    try {
        const cleaned = cleanSql(rawSchema);
        const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0);

        const pendingRelations: Array<{
            fromTable: string;
            fromCol: string;
            toTable: string;
            toCol: string;
            type: NormalizedRelation['type'];
        }> = [];

        for (const stmt of statements) {
            const createTableMatch = stmt.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*)\)/i);

            if (createTableMatch && createTableMatch[1] && createTableMatch[2]) {
                const tableName = createTableMatch[1];
                const body = createTableMatch[2];

                result.schema.tables[tableName] = {
                    columns: {},
                    indexes: [],
                    relations: []
                };

                const parts = splitByComma(body);

                for (const part of parts) {
                    const def = part.trim();
                    if (!def) continue;
                    const upperDef = def.toUpperCase();

                    // 1. Detect Explicit FOREIGN KEY Constraint
                    // Matches: [CONSTRAINT name] FOREIGN KEY (cols) REFERENCES table(cols)
                    if (upperDef.includes('FOREIGN KEY')) {
                        const fkMatch = def.match(/(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([\w",\s]+)\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(([\w",\s]+)\)/i);
                        if (fkMatch) {
                            const [, colsRaw, refTable, refColsRaw] = fkMatch;

                            if (colsRaw && refTable && refColsRaw) {
                                // Handle composite keys or single keys - clean quotes/spaces
                                const fCols = colsRaw.split(',').map(c => c.trim().replace(/["`]/g, ''));
                                const tCols = refColsRaw.split(',').map(c => c.trim().replace(/["`]/g, ''));

                                // but we should process the first one at minimum.
                                if (fCols.length > 0 && tCols.length > 0) {
                                    const fCol = fCols[0];
                                    const tCol = tCols[0];

                                    if (fCol && tCol) {
                                        pendingRelations.push({
                                            fromTable: tableName,
                                            fromCol: fCol,
                                            toTable: refTable!,
                                            toCol: tCol,
                                            type: 'many_to_one'
                                        });
                                    }
                                }
                            }
                            continue; // Done with this part
                        }
                    }

                    // 2. Detect PRIMARY KEY Constraint
                    if (upperDef.includes('PRIMARY KEY') && (upperDef.startsWith('CONSTRAINT') || upperDef.startsWith('PRIMARY'))) {
                        const pkMatch = def.match(/PRIMARY\s+KEY\s*\(([\w",\s]+)\)/i);
                        if (pkMatch && pkMatch[1]) {
                            const pkCols = pkMatch[1].split(',').map(c => c.trim().replace(/["`]/g, ''));
                            pkCols.forEach(pkCol => {
                                const table = result.schema.tables[tableName];
                                if (table && table.columns[pkCol]) {
                                    table.columns[pkCol].primary = true;
                                }
                            });
                        }
                        continue;
                    }

                    // 3. Regular Column Definition (potentially with inline PRIMARY KEY or REFERENCES)
                    // Matches: name type constraints...
                    const colMatch = def.match(/^["`]?(\w+)["`]?\s+([^\s]+)(.*)/);
                    if (colMatch && colMatch[1] && colMatch[2]) {
                        const colName = colMatch[1];
                        const colType = colMatch[2];
                        const rest = colMatch[3] || '';

                        // Inline Constraints
                        const isPk = rest.toUpperCase().includes('PRIMARY KEY');
                        const isUnique = rest.toUpperCase().includes('UNIQUE');
                        const notNull = rest.toUpperCase().includes('NOT NULL');

                        // Inline Foreign Key: ... REFERENCES users(id)
                        const inlineRefMatch = rest.match(/REFERENCES\s+["`]?(\w+)["`]?\s*\(([\w",\s]+)\)/i);
                        let fkDef: string | undefined = undefined;

                        if (inlineRefMatch && inlineRefMatch[1] && inlineRefMatch[2]) {
                            const iToTable = inlineRefMatch[1];
                            const iToCol = inlineRefMatch[2].replace(/["`]/g, ''); // Clean quotes

                            fkDef = `${iToTable}.${iToCol}`;

                            pendingRelations.push({
                                fromTable: tableName,
                                fromCol: colName,
                                toTable: iToTable,
                                toCol: iToCol,
                                type: 'many_to_one'
                            });
                        }

                        const colDef: NormalizedColumn = {
                            type: colType,
                            nullable: !notNull,
                            primary: isPk,
                            unique: isUnique
                        };
                        if (fkDef) colDef.foreign_key = fkDef;

                        const table = result.schema.tables[tableName];
                        if (table) table.columns[colName] = colDef;
                    }
                }
            } else if (stmt.match(/^ALTER\s+TABLE/i)) {
                // ALTER TABLE ADD CONSTRAINT FOREIGN KEY
                const alterMatch = stmt.match(/ALTER\s+TABLE\s+["`]?(\w+)["`]?\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([\w",\s]+)\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(([\w",\s]+)\)/i);
                if (alterMatch && alterMatch[1] && alterMatch[2] && alterMatch[3] && alterMatch[4]) {
                    const fTable = alterMatch[1];
                    const fCol = alterMatch[2].trim().replace(/["`]/g, '');
                    const tTable = alterMatch[3];
                    const tCol = alterMatch[4].trim().replace(/["`]/g, '');

                    pendingRelations.push({
                        fromTable: fTable,
                        fromCol: fCol,
                        toTable: tTable,
                        toCol: tCol,
                        type: 'many_to_one'
                    });
                }
            }
        }

        for (const rel of pendingRelations) {
            const fTable = result.schema.tables[rel.fromTable];
            const tTable = result.schema.tables[rel.toTable];

            if (fTable) {
                fTable.relations.push({
                    type: rel.type,
                    from: `${rel.fromTable}.${rel.fromCol}`,
                    to: `${rel.toTable}.${rel.toCol}`
                });
                const fCol = fTable.columns[rel.fromCol];
                if (fCol) {
                    fCol.foreign_key = `${rel.toTable}.${rel.toCol}`;
                }
            }
            if (tTable) {
                tTable.relations.push({
                    type: 'one_to_many',
                    from: `${rel.toTable}.${rel.toCol}`,
                    to: `${rel.fromTable}.${rel.fromCol}`
                });
            }
        }

        result.stats.table_count = Object.keys(result.schema.tables).length;
        result.stats.relation_count = pendingRelations.length;
        result.stats.column_count = Object.values(result.schema.tables).reduce((acc, t) => acc + Object.keys(t.columns).length, 0);

        if (result.stats.table_count === 0) {
            result.status = 'error';
            result.errors.push("No tables found in input.");
        } else if (result.stats.relation_count === 0) {
            // This is NOT an error - just a helpful warning
            result.warnings.push("No foreign key relationships detected. ER diagrams will show tables only.");
        }

    } catch (e: any) {
        result.status = 'error';
        result.errors.push("Parsing Exception: " + e.message);
    }

    return result;
}

export function generateSql(schema: NormalizedSchema): string {
    let sql = '';

    for (const [tableName, table] of Object.entries(schema.tables)) {
        sql += `CREATE TABLE ${tableName} (\n`;
        const colLines = Object.entries(table.columns).map(([name, col]) => {
            let line = `  ${name} ${col.type}`;
            if (col.primary) line += ' PRIMARY KEY';
            if (!col.nullable) line += ' NOT NULL';
            if (col.unique && !col.primary) line += ' UNIQUE';
            if (col.default) line += ` DEFAULT ${col.default}`;
            return line;
        });

        sql += colLines.join(',\n');
        sql += '\n);\n\n';
    }

    for (const [tableName, table] of Object.entries(schema.tables)) {
        for (const rel of table.relations) {
            if (rel.type === 'many_to_one') {
                const partsFrom = rel.from.split('.');
                const partsTo = rel.to.split('.');
                const fromCol = partsFrom[1];
                const toTable = partsTo[0];
                const toCol = partsTo[1];

                if (fromCol && toTable && toCol) {
                    sql += `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${fromCol} FOREIGN KEY (${fromCol}) REFERENCES ${toTable}(${toCol});\n`;
                }
            }
        }
    }

    return sql;
}
