
export interface UnifiedColumn {
    type: string;
    primary?: boolean;
    nullable?: boolean;
    unique?: boolean;
    default?: string;
    foreign_key?: string; // "table.column"
}

export interface UnifiedRelation {
    type: 'many_to_one' | 'one_to_many' | 'one_to_one' | 'many_to_many';
    from: string;
    to: string;
    on_delete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    on_update?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface UnifiedTable {
    columns: Record<string, UnifiedColumn>;
    relations: UnifiedRelation[];
    description?: string; // Added description field
}

export interface UnifiedSchema {
    tables: Record<string, UnifiedTable>;
}
