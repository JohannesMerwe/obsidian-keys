/**
 * Card metadata (SPEC §C3). Reads both shapes: frontmatter (the format) and
 * today's bold header lines plus the containing directory. Writes nothing.
 */
import { idFromFilename } from './ids';
import { BoardColumn, CardState, columnByName, columnForDir, isCardState } from './manifest';

export interface CardMeta {
	id: string;
	title: string;
	state: CardState;
	/** Column title for display (`Backlog`), or the directory name when no column matches. */
	column: string;
	/** Column directory as declared (`done/{year}`) or observed (`done/2026`). */
	columnDir: string;
	type: string | null;
	path: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function unquote(value: string): string {
	const v = value.trim();
	if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
		return v.slice(1, -1).replace(/\\"/g, '"');
	}
	return v;
}

/** Minimal frontmatter reader: top-level `key: scalar` lines only. Good enough for the card format; nested YAML is ignored. */
export function parseFrontmatter(content: string): Record<string, string> | null {
	const m = FRONTMATTER.exec(content);
	if (!m) return null;
	const out: Record<string, string> = {};
	for (const line of (m[1] ?? '').split(/\r?\n/)) {
		const kv = /^([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
		if (kv) out[kv[1] ?? ''] = unquote(kv[2] ?? '');
	}
	return out;
}

/** Length of the frontmatter block in characters (0 when absent). */
export function frontmatterLength(content: string): number {
	const m = FRONTMATTER.exec(content);
	return m ? m[0].length : 0;
}

function stripFrontmatter(content: string): string {
	return content.slice(frontmatterLength(content));
}

/** `# KK-1 — Title`, `# KK-1 - Title`, `# KK-1: Title`, or a plain first heading. */
export function titleFromBody(body: string, id: string): string | null {
	const heading = /^#\s+(.+?)\s*$/m.exec(body);
	if (!heading) return null;
	let text = (heading[1] ?? '').trim();
	if (text.startsWith(id)) {
		text = text.slice(id.length).replace(/^\s*(?:—|–|-|:)\s*/, '').trim();
	}
	return text || null;
}

/** `**Type:** Feature · **Status:** …` → the value of one bold header key, cut at the next ` · **`. */
export function headerField(body: string, key: string): string | null {
	const re = new RegExp(`\\*\\*${key}:\\*\\*\\s*([^\\n]*)`, 'i');
	const m = re.exec(body);
	if (!m) return null;
	const value = (m[1] ?? '').split(/\s+·\s+\*\*/)[0] ?? '';
	return value.trim() || null;
}

export function humanizeSlug(path: string): string {
	const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/, '');
	const slug = name.replace(/^[A-Z][A-Z0-9]{1,7}-\d+-?/, '');
	return slug.replace(/-/g, ' ').trim();
}

/**
 * Build a card's metadata. `boardDir` is the board directory ('' allowed);
 * `path` the card file, both vault-relative. Returns null when the filename
 * carries no id.
 */
export function parseCard(path: string, content: string, boardDir: string, columns: readonly BoardColumn[]): CardMeta | null {
	const parsed = idFromFilename(path);
	if (!parsed) return null;
	const fm = parseFrontmatter(content) ?? {};
	const body = stripFrontmatter(content);
	const relDir = relativeDir(path, boardDir);
	// The file's directory is the truth for column and state (BOARD_FORMAT §2); frontmatter is the fallback.
	const dirColumn = columnForDir(columns, relDir);
	const fmColumn = fm.column ? columnByName(columns, fm.column) : null;
	const column = dirColumn ?? fmColumn;

	const title = fm.title || titleFromBody(body, parsed.id) || humanizeSlug(path) || parsed.id;
	const state: CardState = column?.state ?? (isCardState(fm.state) ? fm.state : 'todo');
	const type = fm.type || headerField(body, 'Type');
	return {
		id: parsed.id,
		title,
		state,
		column: column?.title ?? fm.column ?? (relDir.split('/')[0] || boardDir.slice(boardDir.lastIndexOf('/') + 1)),
		columnDir: column?.dir ?? fm.column ?? relDir,
		type: type ? type.trim() : null,
		path,
	};
}

/** Directory of `path` relative to `boardDir`: `board/done/2026/X.md` → `done/2026`. */
export function relativeDir(path: string, boardDir: string): string {
	const dir = path.slice(0, Math.max(0, path.lastIndexOf('/')));
	if (boardDir === '') return dir;
	if (dir === boardDir) return '';
	return dir.startsWith(boardDir + '/') ? dir.slice(boardDir.length + 1) : dir;
}
