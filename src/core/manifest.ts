/**
 * Board manifest (`board.json`) per pangolin-board's BOARD_FORMAT.md (SPEC §C3).
 * Only the fields this plugin reads are modelled; unknown fields are preserved
 * by the minting code because it rewrites the parsed object, not a new one.
 */
import { isPrefix } from './ids';

export type CardState = 'todo' | 'in_progress' | 'done';

export interface BoardColumn {
	dir: string;
	title: string;
	state: CardState;
}

export interface BoardManifest {
	id: string;
	title: string;
	prefix: string;
	/** Other prefixes cards on this board carry, for resolution only; minting uses `prefix`. */
	prefixes: string[];
	next: number;
	provider: string;
	columns: BoardColumn[];
}

/** Today's convention, used when a board has no manifest. */
export const DEFAULT_COLUMNS: readonly BoardColumn[] = [
	{ dir: 'backlog', title: 'Backlog', state: 'todo' },
	{ dir: 'wip', title: 'In progress', state: 'in_progress' },
	{ dir: 'done/{year}', title: 'Done', state: 'done' },
];

export const STATE_LABELS: Record<CardState, string> = {
	todo: 'To do',
	in_progress: 'In progress',
	done: 'Done',
};

export function isCardState(value: unknown): value is CardState {
	return value === 'todo' || value === 'in_progress' || value === 'done';
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Parse a manifest object or JSON text. Returns null unless `prefix` fits the grammar and `next` is a positive integer. */
export function parseManifest(input: unknown): BoardManifest | null {
	let value = input;
	if (typeof input === 'string') {
		try {
			value = JSON.parse(input);
		} catch {
			return null;
		}
	}
	const obj = asRecord(value);
	if (!obj) return null;
	const prefix = obj.prefix;
	const next = obj.next;
	if (typeof prefix !== 'string' || !isPrefix(prefix)) return null;
	if (typeof next !== 'number' || !Number.isInteger(next) || next < 1) return null;
	const columns: BoardColumn[] = [];
	if (Array.isArray(obj.columns)) {
		for (const c of obj.columns) {
			const col = asRecord(c);
			if (col && typeof col.dir === 'string' && isCardState(col.state)) {
				columns.push({ dir: col.dir, title: typeof col.title === 'string' ? col.title : col.dir, state: col.state });
			}
		}
	}
	const prefixes: string[] = [];
	if (Array.isArray(obj.prefixes)) {
		for (const p of obj.prefixes) if (typeof p === 'string' && isPrefix(p) && p !== prefix && !prefixes.includes(p)) prefixes.push(p);
	}
	return {
		id: typeof obj.id === 'string' ? obj.id : '',
		title: typeof obj.title === 'string' ? obj.title : '',
		prefix,
		prefixes,
		next,
		provider: typeof obj.provider === 'string' ? obj.provider : 'pangolin-board',
		columns: columns.length ? columns : [...DEFAULT_COLUMNS],
	};
}

/** `done/{year}` → `done/2026`. */
export function columnDir(column: BoardColumn, year: number): string {
	return column.dir.replace('{year}', String(year));
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The column a card directory belongs to. `relDir` is relative to the board
 * directory (`backlog`, `done/2026`, `done`). A `{year}` segment matches four
 * digits, and a card sitting in the parent of a `{year}` column (`done/`) still
 * belongs to that column. Longest declared dir wins.
 */
export function columnForDir(columns: readonly BoardColumn[], relDir: string): BoardColumn | null {
	const sorted = [...columns].sort((a, b) => b.dir.length - a.dir.length);
	for (const col of sorted) {
		const pattern = escapeRegExp(col.dir).replace(/\\\{year\\\}/g, '\\d{4}');
		if (new RegExp(`^${pattern}(/|$)`).test(relDir)) return col;
		const parent = col.dir.replace(/\/\{year\}$/, '');
		if (parent !== col.dir && new RegExp(`^${escapeRegExp(parent)}(/|$)`).test(relDir)) return col;
	}
	return null;
}

/** The column a `column:` frontmatter value names: by dir, then by title, case-insensitively. */
export function columnByName(columns: readonly BoardColumn[], name: string): BoardColumn | null {
	const n = name.trim().toLowerCase();
	return (
		columns.find((c) => c.dir.toLowerCase() === n) ??
		columns.find((c) => c.dir.replace('/{year}', '').toLowerCase() === n) ??
		columns.find((c) => c.title.toLowerCase() === n) ??
		null
	);
}
