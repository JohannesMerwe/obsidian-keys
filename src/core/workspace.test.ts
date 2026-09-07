import { describe, expect, it } from 'vitest';
import { ancestors, detectWorkspace, dirname, findWorkspaceRoot, projectNames, projectOf } from './workspace';

const roots = new Set(['obsidian', 'pangolin', 'wilderless/site']);
const has = (d: string) => roots.has(d);

describe('C1 workspace detection', () => {
	it('lists ancestors nearest first down to the vault root', () => {
		expect(ancestors('a/b/c.md')).toEqual(['a/b', 'a', '']);
		expect(ancestors('c.md')).toEqual(['']);
		expect(dirname('c.md')).toBe('');
	});
	it('finds the nearest keel.json', () => {
		expect(findWorkspaceRoot('obsidian/keys-plugin/INDEX.md', has)).toBe('obsidian');
		expect(findWorkspaceRoot('wilderless/site/docs/x.md', has)).toBe('wilderless/site');
		expect(findWorkspaceRoot('wilderless/other.md', has)).toBeNull();
		expect(findWorkspaceRoot('STRUCTURE.md', has)).toBeNull();
	});
	it('treats a keel.json at the vault root as a workspace', () => {
		expect(findWorkspaceRoot('notes/x.md', (d) => d === '')).toBe('');
	});
	it('resolves the project only when keel.json lists it', () => {
		const projects = ['keys-plugin', 'board-plugin'];
		expect(projectOf('obsidian/keys-plugin/board/backlog/KK-1-x.md', 'obsidian', projects)).toBe('keys-plugin');
		expect(projectOf('obsidian/specs/SPEC.md', 'obsidian', projects)).toBeNull();
		expect(projectOf('obsidian/keys-plugin', 'obsidian', projects)).toBeNull();
		expect(projectOf('keys-plugin/INDEX.md', '', projects)).toBe('keys-plugin');
		expect(projectOf('elsewhere/x.md', 'obsidian', projects)).toBeNull();
	});
	it('reads project names defensively', () => {
		expect(projectNames({ projects: [{ name: 'a' }, { name: 3 }, {}] })).toEqual(['a']);
		expect(projectNames(null)).toEqual([]);
	});
	it('returns null in plain mode', () => {
		expect(detectWorkspace('x.md', has, () => [])).toBeNull();
		expect(detectWorkspace('obsidian/keys-plugin/INDEX.md', has, () => ['keys-plugin'])).toEqual({ root: 'obsidian', project: 'keys-plugin' });
	});
});
