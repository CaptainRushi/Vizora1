/**
 * Version Diff Utilities
 * Computes semantic diff blocks between schema versions with attribution
 * 
 * Mental Model:
 * - This is post-edit, version-based attribution
 * - NOT real-time presence or cursor tracking
 * - Attribution is attached to changes, not lines
 * - Username is snapshotted at save time
 */

export interface DiffBlock {
    blockIndex: number;
    blockStart: number;
    blockEnd: number;
    changeType: 'added' | 'modified' | 'removed';
    beforeText: string | null;
    afterText: string | null;
    editedByUserId: string;
    editedByUsername: string;
}

export interface DiffStats {
    added: number;
    removed: number;
    modified: number;
}

/**
 * Computes diff blocks between two versions of schema code
 * Uses a line-based diffing algorithm optimized for SQL/Prisma schemas
 */
export function computeDiffBlocks(
    oldContent: string,
    newContent: string,
    editorUserId: string,
    editorUsername: string
): DiffBlock[] {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const blocks: DiffBlock[] = [];
    let blockIndex = 0;

    // Simple LCS-based diff algorithm
    const lcs = computeLCS(oldLines, newLines);

    let oldIdx = 0;
    let newIdx = 0;
    let lcsIdx = 0;

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
        // Skip common prefix until we hit a difference or LCS element
        if (lcsIdx < lcs.length &&
            oldIdx < oldLines.length &&
            newIdx < newLines.length &&
            oldLines[oldIdx] === lcs[lcsIdx] &&
            newLines[newIdx] === lcs[lcsIdx]) {
            oldIdx++;
            newIdx++;
            lcsIdx++;
            continue;
        }

        // Collect removals (lines in old but not in new)
        const removedStart = oldIdx;
        const removedLines: string[] = [];
        while (oldIdx < oldLines.length &&
            (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
            removedLines.push(oldLines[oldIdx]);
            oldIdx++;
        }

        // Collect additions (lines in new but not in old)
        const addedStart = newIdx;
        const addedLines: string[] = [];
        while (newIdx < newLines.length &&
            (lcsIdx >= lcs.length || newLines[newIdx] !== lcs[lcsIdx])) {
            addedLines.push(newLines[newIdx]);
            newIdx++;
        }

        // Classify the change type
        if (removedLines.length > 0 && addedLines.length > 0) {
            // Modified: both removed and added at same position
            blocks.push({
                blockIndex,
                blockStart: addedStart + 1, // 1-indexed
                blockEnd: addedStart + addedLines.length,
                changeType: 'modified',
                beforeText: removedLines.join('\n'),
                afterText: addedLines.join('\n'),
                editedByUserId: editorUserId,
                editedByUsername: editorUsername,
            });
            blockIndex++;
        } else if (removedLines.length > 0) {
            // Removed: only removals
            blocks.push({
                blockIndex,
                blockStart: removedStart + 1, // 1-indexed (in old file)
                blockEnd: removedStart + removedLines.length,
                changeType: 'removed',
                beforeText: removedLines.join('\n'),
                afterText: null,
                editedByUserId: editorUserId,
                editedByUsername: editorUsername,
            });
            blockIndex++;
        } else if (addedLines.length > 0) {
            // Added: only additions
            blocks.push({
                blockIndex,
                blockStart: addedStart + 1, // 1-indexed
                blockEnd: addedStart + addedLines.length,
                changeType: 'added',
                beforeText: null,
                afterText: addedLines.join('\n'),
                editedByUserId: editorUserId,
                editedByUsername: editorUsername,
            });
            blockIndex++;
        }
    }

    return mergeAdjacentBlocks(blocks);
}

/**
 * Merge adjacent blocks of the same type for cleaner display
 */
function mergeAdjacentBlocks(blocks: DiffBlock[]): DiffBlock[] {
    if (blocks.length <= 1) return blocks;

    const merged: DiffBlock[] = [];
    let current = { ...blocks[0] };

    for (let i = 1; i < blocks.length; i++) {
        const next = blocks[i];

        // Merge if same type and adjacent (within 2 lines)
        if (current.changeType === next.changeType &&
            current.editedByUserId === next.editedByUserId &&
            next.blockStart <= current.blockEnd + 2) {
            // Extend current block
            current.blockEnd = next.blockEnd;
            if (current.beforeText !== null && next.beforeText !== null) {
                current.beforeText += '\n' + next.beforeText;
            }
            if (current.afterText !== null && next.afterText !== null) {
                current.afterText += '\n' + next.afterText;
            }
        } else {
            merged.push(current);
            current = { ...next };
        }
    }
    merged.push(current);

    // Re-index blocks
    return merged.map((block, idx) => ({ ...block, blockIndex: idx }));
}

/**
 * Compute Longest Common Subsequence of two line arrays
 */
function computeLCS(a: string[], b: string[]): string[] {
    const m = a.length;
    const n = b.length;

    // Dynamic programming table
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the LCS
    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            lcs.unshift(a[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return lcs;
}

/**
 * Compute diff statistics
 */
export function computeDiffStats(blocks: DiffBlock[]): DiffStats {
    let added = 0;
    let removed = 0;
    let modified = 0;

    for (const block of blocks) {
        switch (block.changeType) {
            case 'added':
                added += (block.afterText?.split('\n').length || 0);
                break;
            case 'removed':
                removed += (block.beforeText?.split('\n').length || 0);
                break;
            case 'modified':
                // For modified, count the lines that were actually changed
                const beforeCount = block.beforeText?.split('\n').length || 0;
                const afterCount = block.afterText?.split('\n').length || 0;
                modified += Math.max(beforeCount, afterCount);
                break;
        }
    }

    return { added, removed, modified };
}

/**
 * Format diff blocks for storage in database
 */
export function formatBlocksForStorage(
    blocks: DiffBlock[],
    workspaceId: string,
    fromVersion: number,
    toVersion: number
): Array<{
    workspace_id: string;
    from_version: number;
    to_version: number;
    block_index: number;
    block_start: number;
    block_end: number;
    change_type: string;
    before_text: string | null;
    after_text: string | null;
    edited_by_user_id: string;
    edited_by_username: string;
}> {
    return blocks.map(block => ({
        workspace_id: workspaceId,
        from_version: fromVersion,
        to_version: toVersion,
        block_index: block.blockIndex,
        block_start: block.blockStart,
        block_end: block.blockEnd,
        change_type: block.changeType,
        before_text: block.beforeText,
        after_text: block.afterText,
        edited_by_user_id: block.editedByUserId,
        edited_by_username: block.editedByUsername,
    }));
}
