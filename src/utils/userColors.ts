/**
 * User Color Generator
 * Assigns a unique, consistent color to each user based on their username.
 * The same username will always get the same color.
 */

// Curated color palette - vibrant, accessible colors that look great on dark backgrounds
const USER_COLORS = [
    { name: 'indigo', class: 'text-indigo-400', hex: '#818cf8' },
    { name: 'emerald', class: 'text-emerald-400', hex: '#34d399' },
    { name: 'rose', class: 'text-rose-400', hex: '#fb7185' },
    { name: 'amber', class: 'text-amber-400', hex: '#fbbf24' },
    { name: 'cyan', class: 'text-cyan-400', hex: '#22d3ee' },
    { name: 'violet', class: 'text-violet-400', hex: '#a78bfa' },
    { name: 'pink', class: 'text-pink-400', hex: '#f472b6' },
    { name: 'teal', class: 'text-teal-400', hex: '#2dd4bf' },
    { name: 'orange', class: 'text-orange-400', hex: '#fb923c' },
    { name: 'sky', class: 'text-sky-400', hex: '#38bdf8' },
    { name: 'lime', class: 'text-lime-400', hex: '#a3e635' },
    { name: 'fuchsia', class: 'text-fuchsia-400', hex: '#e879f9' },
];

/**
 * Generate a hash from a string (username)
 * Uses a simple but effective hash function for consistent results
 */
function hashString(str: string): number {
    let hash = 0;
    if (!str || str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash);
}

/**
 * Get a consistent color for a username
 * @param username - The username (with or without @ prefix)
 * @returns Color object with name, Tailwind class, and hex value
 */
export function getUserColor(username: string | null | undefined): typeof USER_COLORS[0] {
    if (!username) {
        return USER_COLORS[0]; // Default to first color for unknown users
    }

    // Normalize username (remove @ prefix if present, lowercase)
    const normalized = username.replace(/^@/, '').toLowerCase().trim();

    // Get hash and map to color index
    const hash = hashString(normalized);
    const colorIndex = hash % USER_COLORS.length;

    return USER_COLORS[colorIndex];
}

/**
 * Get just the Tailwind class for a username
 * Convenience function for inline usage
 */
export function getUserColorClass(username: string | null | undefined): string {
    return getUserColor(username).class;
}

/**
 * Get just the hex color for a username
 * Useful for inline styles or non-Tailwind contexts
 */
export function getUserColorHex(username: string | null | undefined): string {
    return getUserColor(username).hex;
}

/**
 * Get all available user colors (for legend/preview purposes)
 */
export function getAllUserColors() {
    return USER_COLORS;
}
