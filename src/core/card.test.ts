import { describe, expect, it } from 'vitest';
import { headerField, parseCard, parseFrontmatter, relativeDir, titleFromBody } from './card';
import { DEFAULT_COLUMNS } from './manifest';

const fmCard = `---
id: KK-1
title: "Id grammar: index and resolver"
state: todo
column: backlog
type: feature
created: 2026-09-07
updated: 2026-09-07
links: []
---

# KK-1 — Id grammar, index and resolver in src/core

Body.
`;

const headerCard = `# KEEL-1 — Bootstrap \`pangolin-keel\`

**Status:** Done — cut 2026-09-02, closed same day
**Repo:** \`pangolin-keel\` · **Milestone:** M0
**Type:** Chore · **Priority:** Low

---

## Context
`;

describe('parseFrontmatter', () => {
	it('reads scalar keys and unquotes', () => {
		const fm = parseFrontmatter(fmCard);
		expect(fm?.id).toBe('KK-1');
		expect(fm?.title).toBe('Id grammar: index and resolver');
		expect(fm?.links).toBe('[]');
	});
	it('returns null without a block', () => {
		expect(parseFrontmatter(headerCard)).toBeNull();
		expect(parseFrontmatter('---\nno end')).toBeNull();
	});
});

describe('header lines', () => {
	it('reads the title from the H1 after the id', () => {
		expect(titleFromBody('# KEEL-1 — Bootstrap x', 'KEEL-1')).toBe('Bootstrap x');
		expect(titleFromBody('# KEEL-1 - Bootstrap x', 'KEEL-1')).toBe('Bootstrap x');
		expect(titleFromBody('# KEEL-1: Bootstrap x', 'KEEL-1')).toBe('Bootstrap x');
		expect(titleFromBody('intro\n\n# Plain heading', 'KEEL-1')).toBe('Plain heading');
		expect(titleFromBody('no heading', 'KEEL-1')).toBeNull();
	});
	it('reads one bold header field, cut at the next field', () => {
		expect(headerField(headerCard, 'Type')).toBe('Chore');
		expect(headerField(headerCard, 'Status')).toBe('Done — cut 2026-09-02, closed same day');
		expect(headerField(headerCard, 'Milestone')).toBe('M0');
		expect(headerField(headerCard, 'Area')).toBeNull();
	});
});

describe('parseCard', () => {
	it('uses frontmatter for title and type, the directory for column and state', () => {
		const meta = parseCard('obsidian/keys-plugin/board/backlog/KK-1-id-grammar.md', fmCard, 'obsidian/keys-plugin/board', DEFAULT_COLUMNS);
		expect(meta).toMatchObject({ id: 'KK-1', title: 'Id grammar: index and resolver', state: 'todo', column: 'Backlog', columnDir: 'backlog', type: 'feature' });
	});
	it('trusts the directory when frontmatter is stale', () => {
		const meta = parseCard('p/board/wip/KK-1-x.md', fmCard, 'p/board', DEFAULT_COLUMNS);
		expect(meta?.state).toBe('in_progress');
		expect(meta?.column).toBe('In progress');
	});
	it('falls back to frontmatter column when the directory is unknown', () => {
		const meta = parseCard('p/board/odd/KK-1-x.md', fmCard, 'p/board', DEFAULT_COLUMNS);
		expect(meta?.column).toBe('Backlog');
		expect(meta?.state).toBe('todo');
	});
	it('reads header-line cards from the H1 and the containing directory', () => {
		const meta = parseCard('pangolin/keel/board/done/2026/KEEL-1-bootstrap-repo.md', headerCard, 'pangolin/keel/board', DEFAULT_COLUMNS);
		expect(meta).toMatchObject({ id: 'KEEL-1', title: 'Bootstrap `pangolin-keel`', state: 'done', column: 'Done', columnDir: 'done/{year}', type: 'Chore' });
	});
	it('resolves the id from the filename even when frontmatter disagrees', () => {
		const meta = parseCard('p/board/backlog/KK-9-x.md', fmCard, 'p/board', DEFAULT_COLUMNS);
		expect(meta?.id).toBe('KK-9');
	});
	it('humanises the slug when there is no title anywhere', () => {
		const meta = parseCard('p/board/backlog/KK-2-decorate-bare-ids.md', 'just text', 'p/board', DEFAULT_COLUMNS);
		expect(meta?.title).toBe('decorate bare ids');
	});
	it('uses the directory name as column when nothing matches', () => {
		const meta = parseCard('p/board/parked/KK-2-x.md', 'x', 'p/board', DEFAULT_COLUMNS);
		expect(meta?.column).toBe('parked');
		expect(meta?.state).toBe('todo');
	});
	it('returns null for non-card files', () => {
		expect(parseCard('p/board/BOARD.md', '# x', 'p/board', DEFAULT_COLUMNS)).toBeNull();
	});
	it('computes relative directories', () => {
		expect(relativeDir('p/board/done/2026/X-1-a.md', 'p/board')).toBe('done/2026');
		expect(relativeDir('p/board/X-1-a.md', 'p/board')).toBe('');
		expect(relativeDir('X-1-a.md', '')).toBe('');
	});
});
