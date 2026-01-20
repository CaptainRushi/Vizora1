export function cleanSql(sql: string): string {
    return sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function splitByComma(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '(') parenDepth++;
        if (char === ')') parenDepth--;

        if (char === ',' && parenDepth === 0) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current) parts.push(current);
    return parts;
}
