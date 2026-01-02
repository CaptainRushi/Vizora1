
// VIZORA CLIENT-SIDE CODE GENERATORS
// Pure TypeScript - No Node.js dependencies

export interface NormalizedColumn {
    type: string;
    nullable?: boolean;
    primary?: boolean;
    unique?: boolean;
    default?: string;
    foreign_key?: string; // Format: "table.column"
}

export interface NormalizedRelation {
    type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
    from: string;
    to: string;
}

export interface NormalizedTable {
    columns: Record<string, NormalizedColumn>;
    relations: NormalizedRelation[];
}

export interface NormalizedSchema {
    tables: Record<string, NormalizedTable>;
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

    // Constraints
    for (const [tableName, table] of Object.entries(schema.tables)) {
        if (!table.relations) continue;
        for (const rel of table.relations) {
            if (rel.type === 'many_to_one') {
                const partsFrom = rel.from.split('.');
                const partsTo = rel.to.split('.');
                if (partsFrom[1] && partsTo[0] && partsTo[1]) {
                    sql += `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${partsFrom[1]} FOREIGN KEY (${partsFrom[1]}) REFERENCES ${partsTo[0]}(${partsTo[1]});\n`;
                }
            }
        }
    }
    return sql;
}

export function generatePrisma(schema: NormalizedSchema): string {
    let prisma = 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\n';

    for (const [tableName, table] of Object.entries(schema.tables)) {
        const modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
        prisma += `model ${modelName} {\n`;

        for (const [colName, col] of Object.entries(table.columns)) {
            let type = col.type.toLowerCase();
            if (type.includes('uuid')) type = 'String @db.Uuid';
            else if (['int', 'integer', 'serial'].some(t => type.includes(t))) type = 'Int';
            else if (['text', 'varchar'].some(t => type.includes(t))) type = 'String';
            else if (['timestamp', 'timestamptz'].some(t => type.includes(t))) type = 'DateTime';
            else if (type.includes('boolean')) type = 'Boolean';
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

        if (table.relations) {
            for (const rel of table.relations) {
                if (rel.type === 'many_to_one') {
                    const partsTo = rel.to.split('.');
                    const partsFrom = rel.from.split('.');
                    if (partsTo[0] && partsTo[1] && partsFrom[1]) {
                        const targetModel = partsTo[0].charAt(0).toUpperCase() + partsTo[0].slice(1);
                        prisma += `  ${partsTo[0]} ${targetModel} @relation(fields: [${partsFrom[1]}], references: [${partsTo[1]}])\n`;
                    }
                } else if (rel.type === 'one_to_many') {
                    const targetTable = rel.to.split('.')[0];
                    if (targetTable) {
                        const targetModel = targetTable.charAt(0).toUpperCase() + targetTable.slice(1);
                        prisma += `  ${targetTable} ${targetModel}[]\n`;
                    }
                }
            }
        }
        prisma += '}\n\n';
    }
    return prisma;
}

export function generateDrizzle(schema: NormalizedSchema): string {
    let drizzle = `import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";\n\n`;

    for (const [tableName, table] of Object.entries(schema.tables)) {
        drizzle += `export const ${tableName} = pgTable("${tableName}", {\n`;
        for (const [colName, col] of Object.entries(table.columns)) {
            let builder = '';
            const type = col.type.toLowerCase();
            if (type.includes('uuid')) builder = `uuid("${colName}")`;
            else if (['int', 'integer', 'serial'].some(t => type.includes(t))) builder = `integer("${colName}")`;
            else if (['text', 'varchar'].some(t => type.includes(t))) builder = `text("${colName}")`;
            else if (['timestamp', 'timestamptz'].some(t => type.includes(t))) builder = `timestamp("${colName}")`;
            else if (type.includes('boolean')) builder = `boolean("${colName}")`;
            else builder = `text("${colName}")`;

            if (col.primary) builder += '.primaryKey()';
            if (!col.nullable) builder += '.notNull()';
            if (col.unique && !col.primary) builder += '.unique()';
            if (col.default && col.default.toLowerCase().includes('now()')) builder += '.defaultNow()';

            drizzle += `  ${colName}: ${builder},\n`;
        }
        drizzle += '});\n\n';
    }
    return drizzle;
}
