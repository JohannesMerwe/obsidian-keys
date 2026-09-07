import { describe, expect, it } from 'vitest';
import { Board } from './index';
import { DEFAULT_COLUMNS } from './manifest';
import { cardContent, cardFileName, entryColumn, isoDate, newCardDir, slugify } from './newcard';

describe('naming', () => {
	it('slugifies titles', () => {
		expect(slugify('Id grammar, index & resolver in src/core')).toBe('id-grammar-index-resolver-in-src-core');
		expect(slugify('  Déjà vu: again!  ')).toBe('deja-vu-again');
		expect(slugify('')).toBe('');
		expect(slugify('a'.repeat(80))).toHaveLength(60);
		expect(slugify('word '.repeat(30)).endsWith('-')).toBe(false);
	});
	it('builds the filename', () => {
		expect(cardFileName('KK-5', 'New card')).toBe('KK-5-new-card.md');
		expect(cardFileName('KK-5', '???')).toBe('KK-5.md');
	});
	it('picks the entry column and directory', () => {
		expect(entryColumn(DEFAULT_COLUMNS).dir).toBe('backlog');
		expect(entryColumn([{ dir: 'now', title: 'Now', state: 'in_progress' }]).dir).toBe('now');
		expect(entryColumn([]).dir).toBe('backlog');
		const board = { dir: 'p/board' } as Board;
		expect(newCardDir(board, DEFAULT_COLUMNS[2]!, 2026)).toBe('p/board/done/2026');
		expect(newCardDir(board, DEFAULT_COLUMNS[0]!, 2026)).toBe('p/board/backlog');
	});
});

describe('cardContent', () => {
	it('writes the C3 frontmatter and an H1', () => {
		const text = cardContent({ id: 'KK-5', title: 'New card', state: 'todo', column: 'backlog', type: 'task', date: '2026-09-07' });
		expect(text).toBe(
			['---', 'id: KK-5', 'title: New card', 'state: todo', 'column: backlog', 'type: task', 'created: 2026-09-07', 'updated: 2026-09-07', 'links: []', '---', '', '# KK-5 — New card', ''].join('\n'),
		);
	});
	it('quotes titles YAML would misread', () => {
		const text = cardContent({ id: 'KK-5', title: 'Fix: the "thing" #1', state: 'todo', column: 'done/{year}', type: 'bug', date: '2026-09-07' });
		expect(text).toContain('title: "Fix: the \\"thing\\" #1"');
		expect(text).toContain('column: "done/{year}"');
		expect(cardContent({ id: 'KK-5', title: 'yes', state: 'todo', column: 'backlog', type: 'task', date: '2026-09-07' })).toContain('title: "yes"');
		expect(cardContent({ id: 'KK-5', title: '2026 plan', state: 'todo', column: 'backlog', type: 'task', date: '2026-09-07' })).toContain('title: "2026 plan"');
	});
	it('formats dates', () => {
		expect(isoDate(new Date(2026, 8, 7))).toBe('2026-09-07');
	});
});
