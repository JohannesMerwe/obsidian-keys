/**
 * Where a bare id must not be decorated (SPEC §C4): inside links, code,
 * frontmatter, and by extension comments, math, tags and raw HTML. Obsidian's
 * CodeMirror grammar names nodes with underscore-joined class lists such as
 * `hmd-internal-link_link-has-alias` or `HyperMD-codeblock_HyperMD-codeblock-bg`.
 */
const EXCLUDED_FRAGMENTS = ['link', 'url', 'code', 'frontmatter', 'comment', 'math', 'hashtag', 'escape', 'html', 'tag'];

export function isExcludedSyntax(nodeName: string): boolean {
	for (const token of nodeName.toLowerCase().split(/[_\s]+/)) {
		if (!token) continue;
		for (const fragment of EXCLUDED_FRAGMENTS) if (token.includes(fragment)) return true;
	}
	return false;
}

/** Reading-view ancestors a decorated id may not sit under (CSS selector). */
export const EXCLUDED_ANCESTORS = 'a, code, pre, .frontmatter, .metadata-container, .math, .tag, .cm-inline-code, .keel-keys-id';
