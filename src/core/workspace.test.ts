import { describe, expect, it } from 'vitest';
import { VaultFiles, ancestors, dirname, findWorkspace, join } from './workspace';

const files = (map: Record<string, string>): VaultFiles => ({
	exists: (p) => p in map,
	read: (p) => map[p] ?? null,
});

const vault = files({
	'obsidian/keel.json': '{"name":"obsidian","projects":[{"name":"keys-plugin"},{"name":"board-plugin"}]}',
	'pangolin/keel.json': '{"projects":["keel"]}',
	'wilderless/site/keel.json': 'not json',
});

describe('C1 reference implementation (copied from obsidian-open-questions)', () => {
	it('lists ancestors nearest first down to the vault root', () => {
		expect(ancestors('a/b/c.md')).toEqual(['a/b', 'a', '']);
		expect(ancestors('c.md')).toEqual(['']);
		expect(dirname('c.md')).toBe('');
		expect(join('', 'x')).toBe('x');
		expect(join('a', 'x')).toBe('a/x');
	});
	it('finds the nearest keel.json and the project when listed', () => {
		expect(findWorkspace('obsidian/keys-plugin/board/backlog/KK-1-x.md', vault)).toEqual({
			root: 'obsidian',
			name: 'obsidian',
			projects: ['keys-plugin', 'board-plugin'],
			project: 'keys-plugin',
		});
		expect(findWorkspace('obsidian/specs/SPEC.md', vault)?.project).toBeNull();
		expect(findWorkspace('obsidian/keys-plugin', vault)?.project).toBeNull();
	});
	it('accepts bare-string projects and falls back to the directory name', () => {
		expect(findWorkspace('pangolin/keel/board/wip/KEEL-1-x.md', vault)).toEqual({ root: 'pangolin', name: 'pangolin', projects: ['keel'], project: 'keel' });
	});
	it('survives an unreadable manifest', () => {
		expect(findWorkspace('wilderless/site/docs/x.md', vault)).toEqual({ root: 'wilderless/site', name: 'site', projects: [], project: null });
	});
	it('returns null in plain mode', () => {
		expect(findWorkspace('STRUCTURE.md', vault)).toBeNull();
		expect(findWorkspace('wilderless/other.md', vault)).toBeNull();
	});
	it('treats a keel.json at the vault root as a workspace', () => {
		const root = files({ 'keel.json': '{"projects":[{"name":"p"}]}' });
		expect(findWorkspace('p/notes/x.md', root)).toEqual({ root: '', name: 'vault', projects: ['p'], project: 'p' });
	});
});
