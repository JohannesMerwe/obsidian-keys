import { describe, expect, it } from 'vitest';
import { DEFAULT_COLUMNS, columnByName, columnDir, columnForDir, parseManifest } from './manifest';

const text = JSON.stringify({
	id: 'keys-plugin',
	title: 'keys-plugin',
	prefix: 'KK',
	next: 5,
	provider: 'pangolin-board',
	columns: [
		{ dir: 'backlog', title: 'Backlog', state: 'todo' },
		{ dir: 'wip', title: 'In progress', state: 'in_progress' },
		{ dir: 'done/{year}', title: 'Done', state: 'done' },
	],
});

describe('parseManifest', () => {
	it('parses a board.json', () => {
		const m = parseManifest(text);
		expect(m?.prefix).toBe('KK');
		expect(m?.next).toBe(5);
		expect(m?.prefixes).toEqual([]);
		expect(m?.columns).toHaveLength(3);
	});
	it('keeps extra resolution prefixes', () => {
		const m = parseManifest({ prefix: 'FEAT', next: 39, prefixes: ['BUG', 'CHORE', 'FEAT', 'bad', 7] });
		expect(m?.prefixes).toEqual(['BUG', 'CHORE']);
	});
	it('rejects files that are not board manifests', () => {
		expect(parseManifest('{"workspace":"code","boards":[]}')).toBeNull();
		expect(parseManifest({ prefix: 'kk', next: 1 })).toBeNull();
		expect(parseManifest({ prefix: 'KK', next: 0 })).toBeNull();
		expect(parseManifest({ prefix: 'KK', next: '5' })).toBeNull();
		expect(parseManifest('not json')).toBeNull();
		expect(parseManifest(null)).toBeNull();
	});
	it('falls back to the default columns', () => {
		expect(parseManifest({ prefix: 'KK', next: 1 })?.columns).toEqual(DEFAULT_COLUMNS);
		expect(parseManifest({ prefix: 'KK', next: 1, columns: [{ dir: 'x', state: 'weird' }] })?.columns).toEqual(DEFAULT_COLUMNS);
	});
});

describe('columns', () => {
	it('maps directories to columns, year columns included', () => {
		expect(columnForDir(DEFAULT_COLUMNS, 'backlog')?.title).toBe('Backlog');
		expect(columnForDir(DEFAULT_COLUMNS, 'wip')?.state).toBe('in_progress');
		expect(columnForDir(DEFAULT_COLUMNS, 'done/2026')?.state).toBe('done');
		expect(columnForDir(DEFAULT_COLUMNS, 'done')?.state).toBe('done');
		expect(columnForDir(DEFAULT_COLUMNS, 'done/2026/extra')?.state).toBe('done');
		expect(columnForDir(DEFAULT_COLUMNS, 'wipe')).toBeNull();
		expect(columnForDir(DEFAULT_COLUMNS, '')).toBeNull();
	});
	it('prefers the longest declared dir', () => {
		const cols = [
			{ dir: 'done', title: 'Done', state: 'done' as const },
			{ dir: 'done/archive', title: 'Archive', state: 'done' as const },
		];
		expect(columnForDir(cols, 'done/archive')?.title).toBe('Archive');
		expect(columnForDir(cols, 'done/2026')?.title).toBe('Done');
	});
	it('resolves {year}', () => {
		expect(columnDir(DEFAULT_COLUMNS[2]!, 2026)).toBe('done/2026');
	});
	it('finds a column by frontmatter value', () => {
		expect(columnByName(DEFAULT_COLUMNS, 'done/{year}')?.title).toBe('Done');
		expect(columnByName(DEFAULT_COLUMNS, 'done')?.title).toBe('Done');
		expect(columnByName(DEFAULT_COLUMNS, 'In progress')?.dir).toBe('wip');
		expect(columnByName(DEFAULT_COLUMNS, 'nope')).toBeNull();
	});
});
