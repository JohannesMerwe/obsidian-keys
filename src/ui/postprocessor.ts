import { MarkdownPostProcessorContext } from 'obsidian';
import { idFromFilename } from '../core/ids';
import { segmentText } from '../core/segments';
import { EXCLUDED_ANCESTORS } from '../core/syntax';
import type KeelKeysPlugin from '../main';

/** Reading view: replace bare ids in text nodes with decorated spans. Never inside links, code or the properties block. */
export function decorateReadingView(plugin: KeelKeysPlugin, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
	if (!plugin.settings.decorateReading) return;
	if (el.closest(EXCLUDED_ANCESTORS)) return;
	const notePath = ctx.sourcePath;
	const ownId = idFromFilename(notePath)?.id;
	const resolve = (id: string) => plugin.index.resolve(id, notePath)?.path ?? null;

	const walker = el.doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const targets: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node as Text;
		if (!text.nodeValue || !/[A-Z][A-Z0-9]{1,7}-\d/.test(text.nodeValue)) continue;
		if (text.parentElement?.closest(EXCLUDED_ANCESTORS)) continue;
		targets.push(text);
	}
	for (const text of targets) {
		const segments = segmentText(text.nodeValue ?? '', resolve, ownId);
		if (segments.length === 0) continue;
		const fragment = el.doc.createDocumentFragment();
		for (const s of segments) {
			if (s.kind === 'text') fragment.appendText(s.text);
			else fragment.createSpan({ cls: 'keel-keys-id', text: s.id, attr: { 'data-keel-id': s.id, 'data-keel-path': s.path, role: 'link', tabindex: '0' } });
		}
		text.replaceWith(fragment);
	}
}
