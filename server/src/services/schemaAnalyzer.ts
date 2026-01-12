import { NormalizedSchema } from '../../parser.js';

export interface Finding {
    entity: string;
    issue: string;
    impact: string;
    severity: 'High' | 'Medium' | 'Low' | 'Critical';
}

export interface ReviewResults {
    critical: Finding[];
    warnings: Finding[];
    suggestions: Finding[];
}

export function analyzeSchema(schema: NormalizedSchema): ReviewResults {
    const results: ReviewResults = {
        critical: [],
        warnings: [],
        suggestions: []
    };

    const tables = schema.tables;

    for (const [tableName, table] of Object.entries(tables)) {
        const columns = Object.entries(table.columns);
        const columnNames = Object.keys(table.columns);

        // 1. Missing Primary Key -> Critical
        const hasPrimaryKey = columns.some(([_, col]) => col.primary);
        if (!hasPrimaryKey) {
            results.critical.push({
                entity: tableName,
                issue: 'Missing primary key',
                impact: 'This can lead to duplicate rows and poor indexing performance. Database engines use primary keys to uniquely identify records.',
                severity: 'Critical'
            });
        }

        // 2. Table with > 30 columns -> Warning
        if (columnNames.length > 30) {
            results.warnings.push({
                entity: tableName,
                issue: `Large table detected (${columnNames.length} columns)`,
                impact: 'Maintainability and performance might suffer. Consider normalizing or splitting this table into smaller logical entities.',
                severity: 'Medium'
            });
        }

        // 3. Foreign key without index -> High Risk
        // (Note: In many DBs, F_Keys are not automatically indexed by most parsers, 
        // but our parser doesn't always detect all indexes from SQL unless explicitly defined.
        // We will check against table.indexes if available)
        for (const [colName, col] of columns) {
            if (col.foreign_key) {
                const isIndexed = table.indexes.some(idx => idx.columns.includes(colName));
                const isExplicitlyIndexed = isIndexed || col.primary || col.unique;

                if (!isExplicitlyIndexed) {
                    results.warnings.push({
                        entity: `${tableName}.${colName}`,
                        issue: 'Foreign key without index',
                        impact: 'Queries joining on this column will perform full table scans, significantly slowing down the application as data grows.',
                        severity: 'High'
                    });
                }

                // 4. Nullable foreign key -> Medium Risk
                if (col.nullable) {
                    results.suggestions.push({
                        entity: `${tableName}.${colName}`,
                        issue: 'Nullable foreign key',
                        impact: 'Allows orphan records or optional relationships that might complicate business logic. Ensure this is intentional.',
                        severity: 'Medium'
                    });
                }
            }
        }

        // 5. Inconsistent naming (userId vs user_id) -> Low Risk
        for (const colName of columnNames) {
            const hasCamelCase = /[a-z][A-Z]/.test(colName);
            const hasSnakeCase = /_/.test(colName);

            if (hasCamelCase && hasSnakeCase) {
                results.suggestions.push({
                    entity: `${tableName}.${colName}`,
                    issue: 'Mixed naming convention',
                    impact: 'Inconsistent naming makes the schema harder to read and prone to developer errors.',
                    severity: 'Low'
                });
            } else if (hasCamelCase) {
                // If the rest of the schema is snake_case (common in SQL)
                results.suggestions.push({
                    entity: `${tableName}.${colName}`,
                    issue: 'CamelCase naming',
                    impact: 'Most SQL databases prefer snake_case. Ensure your ORM handles case sensitivity correctly.',
                    severity: 'Low'
                });
            }
        }
    }

    return results;
}
