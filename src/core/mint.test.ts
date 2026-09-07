import { describe, expect, it } from 'vitest';
import { bumpManifest, mintWithoutManifest } from './mint';

describe('bumpManifest', () => {
	it('takes next and writes next + 1, preserving format and unknown keys', () => {
		const text = '{\n  "id": "keys-plugin",\n  "prefix": "KK",\n  "next": 5,\n  "custom": {"a": 1},\n  "columns": []\n}\n';
		const bump = bumpManifest(text);
		expect(bump.id).toBe('KK-5');
		expect(bump.number).toBe(5);
		expect(bump.text).toBe('{\n  "id": "keys-plugin",\n  "prefix": "KK",\n  "next": 6,\n  "custom": {\n    "a": 1\n  },\n  "columns": []\n}\n');
		expect(bumpManifest(bump.text).id).toBe('KK-6');
	});
	it('keeps tab indentation and a missing trailing newline', () => {
		const text = '{\n\t"prefix": "KB",\n\t"next": 1\n}';
		expect(bumpManifest(text).text).toBe('{\n\t"prefix": "KB",\n\t"next": 2\n}');
	});
	it('throws on an invalid manifest', () => {
		expect(() => bumpManifest('{"prefix":"KB"}')).toThrow();
		expect(() => bumpManifest('nope')).toThrow();
	});
});

describe('mintWithoutManifest', () => {
	it('mints max + 1, starting at 1', () => {
		expect(mintWithoutManifest([3, 12, 7])).toBe(13);
		expect(mintWithoutManifest([])).toBe(1);
	});
});
