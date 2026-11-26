/* ──────────────────────────────────────────────────────────────────────────
 * closestNames — the names a misspelling most likely meant, for "Did you
 * mean…": "Boromeo" → LNT Borromeo, "Chikin Inasal" → Chicken Inasal,
 * "fairvew" → LNT Fairview.
 *
 * Case, accents, spaces and punctuation don't count. The typed text is
 * compared with the whole name, with each word of it and with each pair of
 * neighbouring words (so "Boromeo" finds "LNT Borromeo"), by how many
 * letters would have to change (edit distance). Names at least `min` alike
 * (0–1) come back, closest first.
 * ────────────────────────────────────────────────────────────────────────── */

const plain = (s: string) =>
    s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

// Letters to add, drop or change to turn a into b (Levenshtein).
const distance = (a: string, b: string) => {
    if (a === b) return 0;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = row;
    }
    return prev[b.length];
};

const alike = (a: string, b: string) => {
    const x = a.replace(/ /g, '');
    const y = b.replace(/ /g, '');
    if (!x || !y) return 0;
    return 1 - distance(x, y) / Math.max(x.length, y.length);
};

/** How alike `typed` is to `name`, 0–1 (its closest whole / word / word pair). */
export const likeness = (name: string, typed: string) => {
    const t = plain(typed);
    const n = plain(name);
    if (!t || !n) return 0;
    if (n.includes(t)) return 1;
    const words = n.split(' ');
    const parts = [n, ...words, ...words.slice(1).map((w, i) => `${words[i]} ${w}`)];
    return Math.max(...parts.map((p) => alike(p, t)));
};

export function closestNames(names: string[], typed: string, { max = 5, min = 0.6 } = {}): string[] {
    if (plain(typed).replace(/ /g, '').length < 3) return [];
    return names
        .map((name) => ({ name, score: likeness(name, typed) }))
        .filter((s) => s.score >= min)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, max)
        .map((s) => s.name);
}
