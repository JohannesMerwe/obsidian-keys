import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import { CardMeta } from '../core/card';
import { KnownId } from '../core/index';
import { STATE_LABELS } from '../core/manifest';
import type KeelKeysPlugin from '../main';

interface Suggestion extends KnownId {
	meta: CardMeta | null;
}

/** Typing a known prefix (`KK`, `KK-`, `KK-1`) offers the ids of the boards visible from the note. */
export class IdSuggest extends EditorSuggest<Suggestion> {
	constructor(private readonly plugin: KeelKeysPlugin) {
		super(plugin.app);
		this.limit = 30;
		this.setInstructions([
			{ command: '↑↓', purpose: 'to navigate' },
			{ command: '↵', purpose: 'to insert the ID' },
			{ command: 'esc', purpose: 'to dismiss' },
		]);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
		const before = editor.getLine(cursor.line).slice(0, cursor.ch);
		// Leave wikilinks to Obsidian's own suggester and stay out of inline code.
		if (before.lastIndexOf('[[') > before.lastIndexOf(']]')) return null;
		if ((before.match(/`/g)?.length ?? 0) % 2 === 1) return null;
		const m = /(^|[^A-Za-z0-9_\-/#.])([A-Z][A-Z0-9]{0,7})(-\d*)?$/.exec(before);
		if (!m) return null;
		const typedPrefix = m[2] ?? '';
		const query = typedPrefix + (m[3] ?? '');
		if (typedPrefix.length < 2) return null;
		const notePath = file?.path ?? '';
		const known = this.plugin.index.boardsFor(notePath).some((b) => b.prefixes.some((p) => p.startsWith(typedPrefix)));
		if (!known) return null;
		return { start: { line: cursor.line, ch: cursor.ch - query.length }, end: cursor, query };
	}

	async getSuggestions(context: EditorSuggestContext): Promise<Suggestion[]> {
		const notePath = context.file.path;
		const q = context.query;
		const hits = this.plugin.index.allIds(notePath).filter((k) => k.id.startsWith(q)).slice(0, this.limit);
		return Promise.all(hits.map(async (k) => ({ ...k, meta: await this.plugin.index.card(k.path) })));
	}

	renderSuggestion(value: Suggestion, el: HTMLElement): void {
		el.addClass('keel-keys-suggestion');
		el.createDiv({ cls: 'keel-keys-suggestion-id', text: value.id });
		const meta = value.meta;
		const text = meta ? `${meta.title} · ${STATE_LABELS[meta.state]} · ${meta.column}` : value.path;
		el.createDiv({ cls: 'keel-keys-suggestion-title', text });
	}

	selectSuggestion(value: Suggestion): void {
		const ctx = this.context;
		if (!ctx) return;
		ctx.editor.replaceRange(value.id, ctx.start, ctx.end);
		ctx.editor.setCursor({ line: ctx.start.line, ch: ctx.start.ch + value.id.length });
	}
}
