import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Keymap, editorInfoField } from 'obsidian';
import { findIds, idFromFilename } from '../core/ids';
import { isExcludedSyntax } from '../core/syntax';
import type KeelKeysPlugin from '../main';
import { decoratedTarget, modClickHint, openCard, showCardPopover } from './hover';

/** True when the syntax node at either end of the range is a link, code, frontmatter or similar. */
function excludedAt(view: EditorView, from: number, to: number): boolean {
	const tree = syntaxTree(view.state);
	for (const [pos, side] of [
		[from, 1],
		[to, -1],
	] as const) {
		let node = tree.resolveInner(pos, side);
		while (node.parent) {
			if (isExcludedSyntax(node.type.name)) return true;
			node = node.parent;
		}
	}
	return false;
}

/** Live Preview and Source mode: mark bare ids that resolve to a card. View-only; nothing is written. */
export function idDecorations(plugin: KeelKeysPlugin) {
	return ViewPlugin.fromClass(
		class implements PluginValue {
			decorations: DecorationSet;
			private generation = -1;
			private enabled = plugin.settings.decorateEditor;

			constructor(view: EditorView) {
				this.decorations = this.build(view);
			}

			update(update: ViewUpdate): void {
				const stale = this.generation !== plugin.index.generation || this.enabled !== plugin.settings.decorateEditor;
				if (update.docChanged || update.viewportChanged || stale) this.decorations = this.build(update.view);
			}

			private build(view: EditorView): DecorationSet {
				this.generation = plugin.index.generation;
				this.enabled = plugin.settings.decorateEditor;
				const builder = new RangeSetBuilder<Decoration>();
				if (!this.enabled) return builder.finish();
				const notePath = view.state.field(editorInfoField, false)?.file?.path ?? '';
				const ownId = idFromFilename(notePath)?.id;
				let lastLine = -1;
				for (const { from, to } of view.visibleRanges) {
					let pos = from;
					while (pos <= to) {
						const line = view.state.doc.lineAt(pos);
						pos = line.to + 1;
						if (line.number <= lastLine) continue;
						lastLine = line.number;
						for (const m of findIds(line.text)) {
							if (m.id === ownId) continue;
							const start = line.from + m.from;
							const end = line.from + m.to;
							if (excludedAt(view, start, end)) continue;
							const hit = plugin.index.resolve(m.id, notePath);
							if (!hit) continue;
							builder.add(
								start,
								end,
								Decoration.mark({
									class: 'keel-keys-id',
									attributes: { 'data-keel-id': m.id, 'data-keel-path': hit.path },
								}),
							);
						}
					}
				}
				return builder.finish();
			}
		},
		{
			decorations: (v) => v.decorations,
			eventHandlers: {
				mousedown(evt: MouseEvent) {
					const hit = decoratedTarget(evt);
					if (!hit || !Keymap.isModEvent(evt)) return false;
					evt.preventDefault();
					void openCard(plugin, hit.path, evt);
					return true;
				},
				mouseover(evt: MouseEvent, view: EditorView) {
					const hit = decoratedTarget(evt);
					if (!hit) return false;
					const parent = view.state.field(editorInfoField, false) ?? plugin.popoverHost;
					showCardPopover(plugin, parent, hit.el, hit.id, hit.path, modClickHint());
					return false;
				},
			},
		},
	);
}
