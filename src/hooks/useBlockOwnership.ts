/**
 * useBlockOwnership - Hook for tracking and displaying code block ownership
 * Optimized for Deterministic, Commit-based Edit Attribution
 * Uses Monaco Decorations + Semantic Block Relocation
 */

import { useEffect, useRef, useMemo } from 'react';
import { BlockAttribution } from './useCollaboration';
import { getUserColorHex } from '../utils/userColors';

interface UseBlockOwnershipOptions {
    editorRef: React.MutableRefObject<any>;
    isConnected: boolean;
    blockAttributions: BlockAttribution[];
    code: string;
}

/**
 * Generate a CSS-safe class name from a username
 */
function getUserCssClass(username: string): string {
    const normalized = username.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `editor-user-${normalized}`;
}

export function useBlockOwnership({
    editorRef,
    isConnected,
    blockAttributions,
    code
}: UseBlockOwnershipOptions) {
    const decorationsCollectionRef = useRef<any>(null);
    const injectedUserStylesRef = useRef<Set<string>>(new Set());

    // Group to latest attribution per semantic block
    const latestAttributions = useMemo(() => {
        const map = new Map<string, BlockAttribution>();
        blockAttributions.forEach(attr => {
            const existing = map.get(attr.blockId);
            if (!existing || attr.updatedAt > existing.updatedAt) {
                map.set(attr.blockId, attr);
            }
        });
        return Array.from(map.values());
    }, [blockAttributions]);

    /**
     * Render block ownership labels using Monaco Decorations
     * Performs semantic relocation to handle line shifts between versions
     */
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const editor = editorRef.current;
            const model = editor?.getModel();
            if (!model || !isConnected) return;

            console.log('[useBlockOwnership] Syncing decorations for', latestAttributions.length, 'semantic blocks');

            if (!decorationsCollectionRef.current) {
                decorationsCollectionRef.current = editor.createDecorationsCollection([]);
            }

            // Inject base styles if not already present
            const baseStyleId = 'editor-block-attribution-styles';
            if (!document.getElementById(baseStyleId)) {
                const styleEl = document.createElement('style');
                styleEl.id = baseStyleId;
                styleEl.textContent = `
                    .editor-block-edit {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
                        font-size: 11px;
                        color: #9ca3af;
                        opacity: 0.8;
                        font-style: italic;
                        pointer-events: none;
                        user-select: none;
                    }
                `;
                document.head.appendChild(styleEl);
            }

            const lines = model.getLinesContent();
            const newDecorations: any[] = [];

            latestAttributions.forEach(attr => {
                // Normalize and safely derive a username to display.
                // Prefer the snapshotted lastEditorName, fall back to the editor id, then 'unknown'.
                const rawName = (attr.lastEditorName && String(attr.lastEditorName).trim()) || attr.lastEditorId || 'unknown';
                const username = rawName.startsWith('@') ? rawName : `@${rawName}`;
                const userColor = getUserColorHex(username);
                const userCssClass = getUserCssClass(username);

                // Dynamically inject user-specific color style if not already done
                if (!injectedUserStylesRef.current.has(userCssClass)) {
                    const userStyleId = `editor-user-style-${userCssClass}`;
                    if (!document.getElementById(userStyleId)) {
                        const userStyleEl = document.createElement('style');
                        userStyleEl.id = userStyleId;
                        userStyleEl.textContent = `
                            .${userCssClass} {
                                color: ${userColor} !important;
                                font-weight: 500;
                            }
                        `;
                        document.head.appendChild(userStyleEl);
                    }
                    injectedUserStylesRef.current.add(userCssClass);
                }

                // RELOCATION LOGIC: Find where this block is NOW
                let actualEndLine = attr.endLine;

                if (attr.blockId.includes(':')) {
                    const [type, name] = attr.blockId.split(':');
                    // Scan for the block start
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].toLowerCase();
                        if (line.includes(type) && line.includes(name)) {
                            // Found the start, now find the end
                            for (let j = i; j < lines.length; j++) {
                                if (lines[j].includes('}') || lines[j].endsWith(');')) {
                                    actualEndLine = j + 1;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }

                // Fallback: Ensure line is within bounds
                actualEndLine = Math.min(actualEndLine, model.getLineCount());

                newDecorations.push({
                    range: {
                        startLineNumber: actualEndLine,
                        startColumn: model.getLineMaxColumn(actualEndLine),
                        endLineNumber: actualEndLine,
                        endColumn: model.getLineMaxColumn(actualEndLine)
                    },
                    options: {
                        after: {
                            content: `\n└── edited by ${username}`,
                            inlineClassName: `editor-block-edit ${userCssClass}`
                        }
                    }
                });
            });

            decorationsCollectionRef.current.set(newDecorations);
        }, 1000); // 1s Debounce

        return () => clearTimeout(timeoutId);
    }, [latestAttributions, isConnected, editorRef.current, code]);

    useEffect(() => {
        return () => {
            if (decorationsCollectionRef.current) {
                decorationsCollectionRef.current.clear();
            }
        };
    }, []);

    return {
        visibleCount: latestAttributions.length
    };
}

