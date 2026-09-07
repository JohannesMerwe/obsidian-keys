/**
 * Id minting (SPEC §C4). `next` in board.json is the only counter: read fresh,
 * write next + 1, then create the file. Without a manifest: max existing + 1,
 * and no manifest is created. These helpers are pure; the shell does the I/O
 * inside an atomic file process.
 */
import { parseManifest } from './manifest';

export interface Bump {
	number: number;
	id: string;
	/** Manifest text with `next` advanced by one; formatting (indent, key order, extra keys) preserved. */
	text: string;
}

function detectIndent(text: string): string | number {
	const m = /\n([ \t]+)"/.exec(text);
	return m?.[1] ?? 2;
}

/** Take the current `next` and return the manifest text with `next + 1`. Throws on an invalid manifest. */
export function bumpManifest(text: string): Bump {
	const manifest = parseManifest(text);
	if (!manifest) throw new Error('board.json is not a valid board manifest (needs prefix and next)');
	const raw = JSON.parse(text) as Record<string, unknown>;
	const number = manifest.next;
	raw.next = number + 1;
	const out = JSON.stringify(raw, null, detectIndent(text)) + (text.endsWith('\n') ? '\n' : '');
	return { number, id: `${manifest.prefix}-${number}`, text: out };
}

/** Next number for a board without a manifest: highest existing + 1, at least 1. */
export function mintWithoutManifest(existing: Iterable<number>): number {
	let max = 0;
	for (const n of existing) if (n > max) max = n;
	return max + 1;
}
