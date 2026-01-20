import { NormalizedSchema } from './types.js';

export interface ChangeObject {
    change_type: 'table_added' | 'table_removed' | 'column_added' | 'column_removed' | 'column_modified' | 'relation_added' | 'relation_removed' | 'relation_modified';
    entity_name: string;
    details: any;
}

export function compareSchemas(oldSchema: NormalizedSchema, newSchema: NormalizedSchema): ChangeObject[] {
    const changes: ChangeObject[] = [];

    const oldTables = Object.keys(oldSchema.tables);
    const newTables = Object.keys(newSchema.tables);

    // 1. Table additions/removals
    newTables.filter(t => !oldTables.includes(t)).forEach(t => {
        changes.push({ change_type: 'table_added', entity_name: t, details: { table: t } });
    });
    oldTables.filter(t => !newTables.includes(t)).forEach(t => {
        changes.push({ change_type: 'table_removed', entity_name: t, details: { table: t } });
    });

    // 2. Column additions/removals/modifications
    for (const table of newTables.filter(t => oldTables.includes(t))) {
        const oldTable = oldSchema.tables[table];
        const newTable = newSchema.tables[table];
        if (!oldTable || !newTable) continue;

        const oldCols = Object.keys(oldTable.columns);
        const newCols = Object.keys(newTable.columns);

        newCols.filter(c => !oldCols.includes(c)).forEach(c => {
            const col = newTable.columns[c];
            if (col) {
                changes.push({ change_type: 'column_added', entity_name: `${table}.${c}`, details: { table, column: c, type: col.type } });
            }
        });
        oldCols.filter(c => !newCols.includes(c)).forEach(c => {
            changes.push({ change_type: 'column_removed', entity_name: `${table}.${c}`, details: { table, column: c } });
        });

        for (const col of newCols.filter(c => oldCols.includes(c))) {
            const oldC = oldTable.columns[col];
            const newC = newTable.columns[col];
            if (!oldC || !newC) continue;

            if (oldC.type !== newC.type) {
                changes.push({
                    change_type: 'column_modified',
                    entity_name: `${table}.${col}`,
                    details: { table, column: col, old_type: oldC.type, new_type: newC.type, diff: 'type' }
                });
            } else if (oldC.nullable !== newC.nullable) {
                changes.push({
                    change_type: 'column_modified',
                    entity_name: `${table}.${col}`,
                    details: { table, column: col, old_nullable: oldC.nullable, new_nullable: newC.nullable, diff: 'nullability' }
                });
            }
        }

        // 3. Relation changes
        const oldRels = oldTable.relations.map(r => `${r.from}->${r.to}`);
        const newRels = newTable.relations.map(r => `${r.from}->${r.to}`);

        newTable.relations.filter(r => !oldRels.includes(`${r.from}->${r.to}`)).forEach(r => {
            changes.push({ change_type: 'relation_added', entity_name: `${r.from}->${r.to}`, details: r });
        });
        oldTable.relations.filter(r => !newRels.includes(`${r.from}->${r.to}`)).forEach(r => {
            changes.push({ change_type: 'relation_removed', entity_name: `${r.from}->${r.to}`, details: r });
        });
    }

    return changes;
}
