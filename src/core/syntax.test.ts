import { describe, expect, it } from 'vitest';
import { isExcludedSyntax } from './syntax';

describe('isExcludedSyntax', () => {
	it('excludes links, code, frontmatter and friends', () => {
		for (const name of [
			'hmd-internal-link',
			'hmd-internal-link_link-has-alias',
			'formatting_formatting-link_link',
			'string_url',
			'inline-code',
			'HyperMD-codeblock_HyperMD-codeblock-bg',
			'hmd-frontmatter',
			'def_hmd-frontmatter',
			'comment',
			'math_math-block',
			'hashtag_hashtag-end',
			'hmd-escape-char',
			'hmd-html-begin',
			'tag',
			'hmd-embed_hmd-internal-link',
			'hmd-barelink_link',
		]) {
			expect(isExcludedSyntax(name), name).toBe(true);
		}
	});
	it('keeps headings, lists, emphasis, quotes and plain text', () => {
		for (const name of ['', 'Document', 'header_header-1', 'HyperMD-header_HyperMD-header-1', 'HyperMD-list-line_HyperMD-list-line-1', 'strong', 'em', 'quote_quote-1', 'HyperMD-quote_HyperMD-quote-1', 'HyperMD-table-row', 'strikethrough', 'highlight']) {
			expect(isExcludedSyntax(name), name).toBe(false);
		}
	});
});
