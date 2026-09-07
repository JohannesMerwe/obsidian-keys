import { describe, expect, it } from 'vitest';
import { segmentText } from './segments';

const resolve = (id: string) => (id === 'KK-1' || id === 'KB-2' ? `boards/${id}.md` : null);

describe('segmentText', () => {
	it('returns nothing when no id resolves', () => {
		expect(segmentText('plain text', resolve)).toEqual([]);
		expect(segmentText('ZZ-9 unknown', resolve)).toEqual([]);
	});
	it('splits text around resolved ids and leaves unresolved ones as text', () => {
		expect(segmentText('See KK-1, ZZ-9 and KB-2.', resolve)).toEqual([
			{ kind: 'text', text: 'See ' },
			{ kind: 'id', id: 'KK-1', path: 'boards/KK-1.md' },
			{ kind: 'text', text: ', ZZ-9 and ' },
			{ kind: 'id', id: 'KB-2', path: 'boards/KB-2.md' },
			{ kind: 'text', text: '.' },
		]);
	});
	it('handles ids at the edges', () => {
		expect(segmentText('KK-1', resolve)).toEqual([{ kind: 'id', id: 'KK-1', path: 'boards/KK-1.md' }]);
		expect(segmentText('KK-1 KB-2', resolve)).toEqual([
			{ kind: 'id', id: 'KK-1', path: 'boards/KK-1.md' },
			{ kind: 'text', text: ' ' },
			{ kind: 'id', id: 'KB-2', path: 'boards/KB-2.md' },
		]);
	});
	it('never decorates the note’s own id', () => {
		expect(segmentText('KK-1 and KB-2', resolve, 'KK-1')).toEqual([
			{ kind: 'text', text: 'KK-1 and ' },
			{ kind: 'id', id: 'KB-2', path: 'boards/KB-2.md' },
		]);
		expect(segmentText('KK-1', resolve, 'KK-1')).toEqual([]);
	});
});
