export interface NormalizedColumn {
    type: string;
    nullable?: boolean;
    primary?: boolean;
    unique?: boolean;
    default?: string;
    foreign_key?: string; // Format: "table.column"
}

export interface NormalizedIndex {
    name: string;
    columns: string[];
    unique: boolean;
}

export interface NormalizedRelation {
    type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
    from: string; // Format: "table.column"
    to: string;   // Format: "table.column"
}

export interface NormalizedTable {
    columns: Record<string, NormalizedColumn>;
    relations: NormalizedRelation[];
    indexes: NormalizedIndex[];
}

export interface NormalizedSchema {
    tables: Record<string, NormalizedTable>;
}

export interface ParsingResult {
    status: 'success' | 'partial' | 'error';
    input_type: 'sql' | 'prisma' | 'unknown';
    errors: string[];
    warnings: string[];
    schema: NormalizedSchema;
    stats: {
        table_count: number;
        column_count: number;
        relation_count: number;
    };
}
