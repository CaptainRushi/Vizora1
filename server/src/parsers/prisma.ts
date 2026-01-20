import { NormalizedSchema, ParsingResult } from './types.js';

export function parsePrisma(prisma: string): ParsingResult {
    const result: ParsingResult = {
        status: 'success',
        input_type: 'prisma',
        errors: [],
        warnings: [],
        schema: { tables: {} },
        stats: { table_count: 0, column_count: 0, relation_count: 0 }
    };

    try {
        const models = prisma.match(/model\s+(\w+)\s*{([\s\S]*?)}/g);
        if (!models) {
            result.status = 'error';
            result.errors.push("No models found in Prisma schema.");
            return result;
        }

        for (const model of models) {
            const nameMatch = model.match(/model\s+(\w+)/);
            if (!nameMatch || !nameMatch[1]) continue;
            const tableName = nameMatch[1].toLowerCase();
            const bodyMatch = model.match(/{([\s\S]*?)}/);
            const body = (bodyMatch && bodyMatch[1]) ? bodyMatch[1] : '';

            result.schema.tables[tableName] = {
                columns: {},
                indexes: [],
                relations: []
            };

            const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
                if (line.startsWith('@@')) continue;

                const parts = line.split(/\s+/);
                if (parts.length < 2) continue;

                const colName = parts[0];
                const colTypeRaw = parts[1] || '';
                const rest = parts.slice(2).join(' ') || '';

                const isPk = rest.includes('@id');
                const isUnique = rest.includes('@unique');
                const isOptional = colTypeRaw.endsWith('?');

                let type = colTypeRaw.replace('?', '');
                if (type === 'String') type = 'text';
                else if (type === 'Int') type = 'integer';
                else if (type === 'DateTime') type = 'timestamp';
                else if (type === 'Boolean') type = 'boolean';
                else if (type === 'Json') type = 'jsonb';

                if (colName) {
                    const table = result.schema.tables[tableName];
                    if (table) {
                        table.columns[colName] = {
                            type,
                            nullable: isOptional,
                            primary: isPk,
                            unique: isUnique
                        };
                    }
                }
            }
        }

        // Infer relationships from column names (e.g., userId -> User table)
        for (const [tableName, table] of Object.entries(result.schema.tables)) {
            for (const [colName, col] of Object.entries(table.columns)) {
                // Check if column name suggests a foreign key
                if (colName.endsWith('Id') && colName !== 'id') {
                    // Extract referenced table name (e.g., userId -> user)
                    let refTable = colName.replace(/Id$/, '').toLowerCase();

                    // Check if referenced table exists
                    if (result.schema.tables[refTable]) {
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

    } catch (e: any) {
        result.status = 'error';
        result.errors.push(e.message);
    }

    return result;
}

export function generatePrisma(schema: NormalizedSchema): string {
    let prisma = 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\n';

    for (const [tableName, table] of Object.entries(schema.tables)) {
        const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
        prisma += `model ${modelName} {\n`;

        for (const [colName, col] of Object.entries(table.columns)) {
            let type = col.type.toLowerCase();
            if (type === 'uuid') type = 'String @db.Uuid';
            else if (type === 'int' || type === 'integer' || type === 'serial') type = 'Int';
            else if (type === 'text' || type === 'varchar') type = 'String';
            else if (type === 'timestamp' || type === 'timestamptz') type = 'DateTime';
            else if (type === 'boolean') type = 'Boolean';
            else type = 'String';

            let line = `  ${colName} ${type}`;
            if (col.primary) line += ' @id';
            if (col.unique && !col.primary) line += ' @unique';
            if (col.default) {
                if (col.default.toLowerCase().includes('now()')) line += ' @default(now())';
                else if (col.default.toLowerCase().includes('uuid_generate_v4()')) line += ' @default(uuid())';
            }
            prisma += line + '\n';
        }

        for (const rel of table.relations) {
            if (rel.type === 'many_to_one') {
                const partsTo = rel.to.split('.');
                const partsFrom = rel.from.split('.');

                const targetTable = partsTo[0];
                const targetCol = partsTo[1];
                const sourceCol = partsFrom[1];

                if (targetTable && targetCol && sourceCol) {
                    const targetModel = targetTable.charAt(0).toUpperCase() + targetTable.slice(1);
                    prisma += `  ${targetTable} ${targetModel} @relation(fields: [${sourceCol}], references: [${targetCol}])\n`;
                }
            } else if (rel.type === 'one_to_many') {
                const targetTable = rel.to.split('.')[0];
                if (targetTable) {
                    const targetModel = targetTable.charAt(0).toUpperCase() + targetTable.slice(1);
                    prisma += `  ${targetTable} ${targetModel}[]\n`;
                }
            }
        }

        prisma += '}\n\n';
    }

    return prisma;
}
