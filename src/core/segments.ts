import { findIds } from './ids';

/** A run of plain text or a resolved id inside a text node. */
export type Segment = { kind: 'text'; text: string } | { kind: 'id'; id: string; path: string };

/**
 * Split running text into plain runs and resolved ids. Unresolved ids stay
 * plain text; `skipId` (the note's own id) is never decorated.
 */
export function segmentText(text: string, resolve: (id: string) => string | null, skipId?: string): Segment[] {
	const out: Segment[] = [];
	let cursor = 0;
	for (const m of findIds(text)) {
		if (m.id === skipId) continue;
		const path = resolve(m.id);
		if (path === null) continue;
		if (m.from > cursor) out.push({ kind: 'text', text: text.slice(cursor, m.from) });
		out.push({ kind: 'id', id: m.id, path });
		cursor = m.to;
	}
	if (out.length === 0) return [];
	if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) });
	return out;
}
