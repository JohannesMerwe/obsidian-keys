import { describe, expect, it } from 'vitest';
import { findIds, idFromFilename, isId, parseId } from './ids';

describe('id grammar', () => {
	it('accepts the C4 grammar', () => {
		for (const id of ['KK-1', 'BOARD-12', 'A1-3', 'ABCDEFGH-1', 'K9-0']) expect(isId(id)).toBe(true);
	});
	it('rejects what is outside it', () => {
		for (const id of ['K-1', 'kk-1', 'ABCDEFGHI-1', '1A-1', 'KK-', 'KK-1a', 'KK_1', 'KK-1-2', ' KK-1']) expect(isId(id)).toBe(false);
	});
	it('splits prefix and number', () => {
		expect(parseId('BOARD-12')).toEqual({ id: 'BOARD-12', prefix: 'BOARD', number: 12 });
		expect(parseId('nope')).toBeNull();
	});
});

describe('idFromFilename', () => {
	it('reads the id from a card filename or path', () => {
		expect(idFromFilename('KK-1-id-grammar.md')?.id).toBe('KK-1');
		expect(idFromFilename('obsidian/keys-plugin/board/done/2026/KK-12-x.md')).toEqual({ id: 'KK-12', prefix: 'KK', number: 12 });
	});
	it('ignores files that are not cards', () => {
		expect(idFromFilename('BOARD.md')).toBeNull();
		expect(idFromFilename('INFRA-docker-port-migration.md')).toBeNull();
		expect(idFromFilename('KK-1.md')).toBeNull();
		expect(idFromFilename('KK-1-notes.txt')).toBeNull();
	});
});

describe('findIds', () => {
	const ids = (t: string) => findIds(t).map((m) => m.id);
	it('finds bare ids with offsets', () => {
		expect(findIds('see KK-1 and BOARD-12.')).toEqual([
			{ id: 'KK-1', from: 4, to: 8 },
			{ id: 'BOARD-12', from: 13, to: 21 },
		]);
	});
	it('handles punctuation and line starts', () => {
		expect(ids('KK-1, (KK-2) [KK-3] KK-4;\nKK-5:')).toEqual(['KK-1', 'KK-2', 'KK-3', 'KK-4', 'KK-5']);
		expect(ids('KK-1,KK-2')).toEqual(['KK-1', 'KK-2']);
	});
	it('does not match inside words, filenames, paths or tags', () => {
		expect(ids('KK-1-slug KK-12-x xKK-3 KK-4a KK_5 board/KK-6 #KK-7 v.KK-8 KK-9_')).toEqual([]);
		expect(ids('KK-1-slug.md')).toEqual([]);
	});
	it('does not match lower-case or overlong prefixes', () => {
		expect(ids('kk-1 ABCDEFGHI-1 K-1')).toEqual([]);
	});
});
