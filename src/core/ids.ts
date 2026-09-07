/**
 * Id grammar (SPEC-integration §C4): `^[A-Z][A-Z0-9]{1,7}-\d+$`.
 * Pure functions; no obsidian import.
 */

export const ID_PATTERN = /^[A-Z][A-Z0-9]{1,7}-\d+$/;
export const PREFIX_PATTERN = /^[A-Z][A-Z0-9]{1,7}$/;

/**
 * A bare id inside running text: not glued to a word character, a hyphen, a
 * slash (paths), a dot or a hash (tags) on the left, and not followed by a word
 * character or a hyphen (which would make it a filename such as `KK-1-slug`).
 * No lookbehind, so it runs on older mobile WebKit.
 */
const BARE_ID = /(^|[^A-Za-z0-9_\-/#.])([A-Z][A-Z0-9]{1,7}-\d+)(?![A-Za-z0-9_-])/g;

/** `<PREFIX>-<N>-<slug>.md`; a file without a slug is not a card (BOARD_FORMAT §2). */
const FILENAME_ID = /^([A-Z][A-Z0-9]{1,7})-(\d+)-[^/]+\.md$/;

export interface ParsedId {
	id: string;
	prefix: string;
	number: number;
}

export interface IdMatch {
	id: string;
	from: number;
	to: number;
}

export function isId(text: string): boolean {
	return ID_PATTERN.test(text);
}

export function isPrefix(text: string): boolean {
	return PREFIX_PATTERN.test(text);
}

export function parseId(text: string): ParsedId | null {
	if (!ID_PATTERN.test(text)) return null;
	const dash = text.lastIndexOf('-');
	return { id: text, prefix: text.slice(0, dash), number: Number(text.slice(dash + 1)) };
}

/** Resolve the id a card file carries from its basename (or a full path). */
export function idFromFilename(pathOrName: string): ParsedId | null {
	const name = pathOrName.slice(pathOrName.lastIndexOf('/') + 1);
	const m = FILENAME_ID.exec(name);
	if (!m) return null;
	const prefix = m[1] ?? '';
	const number = Number(m[2]);
	return { id: `${prefix}-${number}`, prefix, number };
}

/** Every bare id in `text`, with character offsets. Structural exclusions (links, code, frontmatter) are the caller's job. */
export function findIds(text: string): IdMatch[] {
	const out: IdMatch[] = [];
	BARE_ID.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = BARE_ID.exec(text)) !== null) {
		const lead = m[1] ?? '';
		const id = m[2] ?? '';
		const from = m.index + lead.length;
		out.push({ id, from, to: from + id.length });
		// Allow adjacent matches such as "KK-1,KK-2": the separator was consumed as the lead.
		BARE_ID.lastIndex = from + id.length;
	}
	return out;
}
