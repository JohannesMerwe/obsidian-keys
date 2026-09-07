import { describe, expect, it } from 'vitest';
import { BoardIndex, FileSource } from './index';

function source(files: Record<string, string>): FileSource & { files: Record<string, string> } {
	return {
		files,
		listPaths: () => Object.keys(files),
		read: (p) => (p in files ? Promise.resolve(files[p] ?? '') : Promise.reject(new Error('missing ' + p))),
	};
}

const manifest = (prefix: string, next: number, extra: Record<string, unknown> = {}) =>
	JSON.stringify({ id: prefix.toLowerCase(), title: prefix, prefix, next, provider: 'pangolin-board', ...extra });

const vault = {
	'obsidian/keel.json': '{"projects":[{"name":"keys-plugin"},{"name":"board-plugin"}]}',
	'obsidian/keys-plugin/board/board.json': manifest('KK', 5),
	'obsidian/keys-plugin/board/BOARD.md': '# board',
	'obsidian/keys-plugin/board/backlog/KK-1-grammar.md': '---\nid: KK-1\ntitle: Grammar\nstate: todo\ncolumn: backlog\n---\n',
	'obsidian/keys-plugin/board/backlog/KK-2-decorate.md': '# KK-2 — Decorate',
	'obsidian/keys-plugin/board/done/2026/KK-3-old.md': '# KK-3 — Old',
	'obsidian/board-plugin/board/board.json': manifest('KB', 2),
	'obsidian/board-plugin/board/backlog/KB-1-model.md': '# KB-1 — Model',
	'obsidian/INDEX.md': 'See BOARD-1 and KK-1',
	'pangolin/keel.json': '{"projects":[{"name":"board"},{"name":"keel"}]}',
	'pangolin/board/board/backlog/BOARD-1-adopt.md': '# BOARD-1 — Adopt the format\n\n**Type:** Migration · **Status:** Backlog\n',
	'pangolin/keel/board/wip/KEEL-11-seam.md': '# KEEL-11 — Seam',
	'pangolin/keel/board/done/2026/KEEL-1-bootstrap.md': '# KEEL-1 — Bootstrap',
	'pangolin/keel/board/backlog/KEEL-12-x.md': '# KEEL-12 — X',
	'pangolin/data/board.json': '{"workspace":"code","boards":[]}',
	'pangolin/fairshare/board/board.json': manifest('FEAT', 40, { prefixes: ['BUG'] }),
	'pangolin/fairshare/board/wip/FEAT-13-teams.md': '# FEAT-13 — Teams',
	'pangolin/fairshare/board/backlog/BUG-2-crash.md': '# BUG-2 — Crash',
	'pangolin/fairshare/board/backlog/CHORE-1-lint.md': '# CHORE-1 — Lint',
	'loose/board/backlog/LOOSE-4-plain.md': '# LOOSE-4 — Plain mode card',
	'notes/KK-1-not-a-card.md': 'looks like a card but is not under a board',
};

describe('BoardIndex build', () => {
	it('discovers manifest boards and scanned boards', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		const dirs = index.boards().map((b) => `${b.dir}|${b.prefix}`);
		expect(dirs).toEqual([
			'loose/board|LOOSE',
			'obsidian/board-plugin/board|KB',
			'obsidian/keys-plugin/board|KK',
			'pangolin/board/board|BOARD',
			'pangolin/fairshare/board|FEAT',
			'pangolin/keel/board|KEEL',
		]);
		expect(index.generation).toBe(1);
	});
	it('ignores board.json files that are not manifests and cards outside boards', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		expect(index.boards().some((b) => b.dir === 'pangolin/data')).toBe(false);
		expect(index.resolve('KK-1', 'x.md')?.path).toBe('obsidian/keys-plugin/board/backlog/KK-1-grammar.md');
	});
	it('records workspace roots and manifests', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		expect(index.boardAt('obsidian/keys-plugin/board')?.workspaceRoot).toBe('obsidian');
		expect(index.boardAt('obsidian/keys-plugin/board')?.manifest?.next).toBe(5);
		expect(index.boardAt('pangolin/keel/board')?.manifest).toBeNull();
		expect(index.boardAt('loose/board')?.workspaceRoot).toBeNull();
	});
	it('lets a manifest board own its extra prefixes, and scans the rest', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		const fair = index.boardAt('pangolin/fairshare/board');
		expect(fair?.prefixes).toEqual(['FEAT', 'BUG']);
		expect(index.resolve('BUG-2', 'pangolin/x.md')?.board).toBe(fair);
		// CHORE is not listed by the manifest, and the directory already has one: not indexed.
		expect(index.resolve('CHORE-1', 'pangolin/x.md')).toBeNull();
	});
});

describe('BoardIndex resolution', () => {
	it('resolves ids and finds files at any depth', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		expect(index.resolve('KK-3', 'obsidian/INDEX.md')?.path).toBe('obsidian/keys-plugin/board/done/2026/KK-3-old.md');
		expect(index.resolve('KEEL-1', 'pangolin/INDEX.md')?.path).toBe('pangolin/keel/board/done/2026/KEEL-1-bootstrap.md');
		expect(index.resolve('KK-4', 'obsidian/INDEX.md')).toBeNull();
		expect(index.resolve('ZZ-1', 'obsidian/INDEX.md')).toBeNull();
		expect(index.resolve('not an id', 'obsidian/INDEX.md')).toBeNull();
	});
	it('falls back across workspaces unless told not to', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		expect(index.resolve('BOARD-1', 'obsidian/INDEX.md')?.path).toBe('pangolin/board/board/backlog/BOARD-1-adopt.md');
		index.options.crossWorkspace = false;
		expect(index.resolve('BOARD-1', 'obsidian/INDEX.md')).toBeNull();
		expect(index.resolve('BOARD-1', 'pangolin/INDEX.md')).not.toBeNull();
	});
	it('prefers the note’s own workspace when a prefix exists in two', async () => {
		const files = {
			...vault,
			'pangolin/kk/board/backlog/KK-1-other.md': '# KK-1 — Other',
		};
		const index = new BoardIndex(source(files));
		await index.ensure();
		expect(index.resolve('KK-1', 'obsidian/INDEX.md')?.path).toBe('obsidian/keys-plugin/board/backlog/KK-1-grammar.md');
		expect(index.resolve('KK-1', 'pangolin/INDEX.md')?.path).toBe('pangolin/kk/board/backlog/KK-1-other.md');
		expect(index.resolve('KK-1', 'elsewhere.md')?.path).toBe('obsidian/keys-plugin/board/backlog/KK-1-grammar.md');
	});
	it('lists ids for autocomplete, own workspace first, newest first', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		const ids = index.allIds('obsidian/INDEX.md').map((k) => k.id);
		expect(ids.slice(0, 4)).toEqual(['KB-1', 'KK-3', 'KK-2', 'KK-1']);
		expect(ids).toContain('KEEL-12');
		expect(ids.indexOf('KEEL-12')).toBeLessThan(ids.indexOf('KEEL-11'));
		index.options.crossWorkspace = false;
		expect(index.allIds('obsidian/INDEX.md').map((k) => k.id)).toEqual(['KB-1', 'KK-3', 'KK-2', 'KK-1']);
	});
	it('finds the board containing a note and the max number', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		const keel = index.boardContaining('pangolin/keel/board/wip/KEEL-11-seam.md');
		expect(keel?.prefix).toBe('KEEL');
		expect(index.maxNumber(keel!)).toBe(12);
		expect(index.boardContaining('pangolin/INDEX.md')).toBeNull();
	});
});

describe('BoardIndex metadata and invalidation', () => {
	it('reads and caches card metadata', async () => {
		const src = source({ ...vault });
		const index = new BoardIndex(src);
		await index.ensure();
		const path = 'obsidian/keys-plugin/board/backlog/KK-2-decorate.md';
		expect(await index.card(path)).toMatchObject({ id: 'KK-2', title: 'Decorate', state: 'todo', column: 'Backlog' });
		src.files[path] = '# KK-2 — Renamed';
		expect((await index.card(path))?.title).toBe('Decorate');
		index.invalidate(path, false);
		expect((await index.card(path))?.title).toBe('Renamed');
		expect(index.isDirty).toBe(false);
	});
	it('rebuilds after a structural invalidation and forgets deleted files', async () => {
		const src = source({ ...vault });
		const index = new BoardIndex(src);
		await index.ensure();
		const path = 'obsidian/keys-plugin/board/backlog/KK-4-new.md';
		expect(index.resolve('KK-4', 'obsidian/INDEX.md')).toBeNull();
		src.files[path] = '# KK-4 — New';
		index.invalidate(path);
		expect(index.isDirty).toBe(true);
		await index.ensure();
		expect(index.resolve('KK-4', 'obsidian/INDEX.md')?.path).toBe(path);
		expect(index.generation).toBe(2);
		delete src.files[path];
		index.invalidate(path);
		await index.ensure();
		expect(index.resolve('KK-4', 'obsidian/INDEX.md')).toBeNull();
	});
	it('shares one build between concurrent callers', async () => {
		const index = new BoardIndex(source(vault));
		await Promise.all([index.ensure(), index.ensure(), index.ensure()]);
		expect(index.generation).toBe(1);
	});
	it('returns null metadata for unreadable files', async () => {
		const index = new BoardIndex(source(vault));
		await index.ensure();
		expect(await index.card('nowhere/KK-1-x.md')).toBeNull();
	});
});
