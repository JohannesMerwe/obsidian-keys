import { HoverParent, HoverPopover, Keymap, Platform, UserEvent } from 'obsidian';
import { CardMeta } from '../core/card';
import { STATE_LABELS } from '../core/manifest';
import type KeelKeysPlugin from '../main';

/** A HoverParent for surfaces that have none of their own (reading view). */
export class PopoverHost implements HoverParent {
	hoverPopover: HoverPopover | null = null;
}

const open = new WeakMap<HTMLElement, HoverPopover>();

function renderPreview(root: HTMLElement, id: string, path: string, meta: CardMeta | null): void {
	root.empty();
	root.createDiv({ cls: 'keel-keys-preview-id', text: id });
	root.createDiv({ cls: 'keel-keys-preview-title', text: meta ? meta.title : 'Loading…' });
	if (meta) {
		const line = root.createDiv({ cls: 'keel-keys-preview-meta' });
		line.createSpan({ cls: ['keel-keys-state', `keel-keys-state-${meta.state.replace('_', '-')}`], text: STATE_LABELS[meta.state] });
		line.createSpan({ text: meta.column });
		if (meta.type) line.createSpan({ cls: 'keel-keys-preview-type', text: meta.type });
	}
	root.createDiv({ cls: 'keel-keys-preview-path', text: path });
}

/** Show the card preview (title, state, column) for a decorated id. Idempotent while a popover for that element is up. */
export function showCardPopover(plugin: KeelKeysPlugin, parent: HoverParent, target: HTMLElement, id: string, path: string, hint: string | null): void {
	if (!plugin.settings.hoverPreview || open.has(target)) return;
	const popover = new HoverPopover(parent, target, 300);
	open.set(target, popover);
	popover.register(() => open.delete(target));
	popover.hoverEl.addClass('keel-keys-popover');
	const root = popover.hoverEl.createDiv({ cls: 'keel-keys-preview' });
	renderPreview(root, id, path, null);
	if (hint) popover.hoverEl.createDiv({ cls: 'keel-keys-preview-hint', text: hint });
	void plugin.index.card(path).then((meta) => renderPreview(root, id, path, meta));
}

export function modClickHint(): string {
	return Platform.isMacOS ? 'Cmd+click to open' : 'Ctrl+click to open';
}

/** Open a card file, honouring the modifier keys (new tab, split, window). */
export async function openCard(plugin: KeelKeysPlugin, path: string, evt: UserEvent | null): Promise<void> {
	const file = plugin.app.vault.getFileByPath(path);
	if (!file) return;
	await plugin.app.workspace.getLeaf(Keymap.isModEvent(evt)).openFile(file);
}

/** The decorated element under an event target, if any. */
export function decoratedTarget(evt: Event): { el: HTMLElement; id: string; path: string } | null {
	const node = evt.target;
	if (!(node instanceof HTMLElement || node instanceof Text)) return null;
	const el = (node instanceof Text ? node.parentElement : node)?.closest<HTMLElement>('.keel-keys-id') ?? null;
	const id = el?.dataset.keelId;
	const path = el?.dataset.keelPath;
	return el && id && path ? { el, id, path } : null;
}
