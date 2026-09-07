import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { idFromFilename } from '../core/ids';
import { Board } from '../core/index';
import { bumpManifest, mintWithoutManifest } from '../core/mint';
import { cardContent, cardFileName, entryColumn, isoDate, newCardDir } from '../core/newcard';
import { join } from '../core/workspace';
import type KeelKeysPlugin from '../main';

/** A board is writable unless its manifest names a provider other than pangolin-board (SPEC §C3). */
export function isWritable(board: Board): boolean {
	return board.manifest === null || board.manifest.provider === 'pangolin-board';
}

function boardLabel(board: Board): string {
	const name = board.manifest?.title || board.dir;
	return `${name} (${board.prefix})`;
}

/** Numbers already used by files for `prefix` under the board, read fresh from the vault. */
function usedNumbers(app: App, board: Board): Set<number> {
	const used = new Set<number>();
	for (const f of app.vault.getMarkdownFiles()) {
		if (!f.path.startsWith(board.dir + '/')) continue;
		const parsed = idFromFilename(f.path);
		if (parsed && parsed.prefix === board.prefix) used.add(parsed.number);
	}
	return used;
}

/**
 * Mint the next id per §C4. With a manifest: read `board.json` fresh, write
 * `next + 1`, then create the file. Without one: max existing + 1, no manifest.
 */
export async function mintId(plugin: KeelKeysPlugin, board: Board): Promise<string> {
	const used = usedNumbers(plugin.app, board);
	if (!board.manifest) return `${board.prefix}-${mintWithoutManifest(used)}`;
	const manifestPath = join(board.dir, 'board.json');
	const file = plugin.app.vault.getFileByPath(manifestPath);
	if (!file) throw new Error(`${manifestPath} disappeared`);
	let id = '';
	await plugin.app.vault.process(file, (data) => {
		const bump = bumpManifest(data, (n) => used.has(n));
		id = bump.id;
		return bump.text;
	});
	plugin.index.invalidate(manifestPath, true);
	return id;
}

export async function createCard(plugin: KeelKeysPlugin, board: Board, title: string, type: string): Promise<TFile> {
	if (!isWritable(board)) throw new Error(`${boardLabel(board)} is mirrored from ${board.manifest?.provider ?? 'another tracker'}; create the card there.`);
	const now = new Date();
	const column = entryColumn(board.columns);
	const dir = newCardDir(board, column, now.getFullYear());
	if (!plugin.app.vault.getFolderByPath(dir)) await plugin.app.vault.createFolder(dir);
	const id = await mintId(plugin, board);
	const path = join(dir, cardFileName(id, title));
	if (plugin.app.vault.getFileByPath(path)) throw new Error(`${path} already exists`);
	const content = cardContent({ id, title, state: column.state, column: column.dir, type, date: isoDate(now) });
	const file = await plugin.app.vault.create(path, content);
	plugin.index.invalidate(path, true);
	return file;
}

/** The board a new card most likely belongs to: the note's project board, else the board around the note, else the first visible one. */
export function defaultBoard(plugin: KeelKeysPlugin, notePath: string | null, boards: Board[]): Board | null {
	if (notePath !== null) {
		const ws = plugin.index.workspaceOf(notePath);
		if (ws?.project) {
			const board = plugin.index.boardAt(join(join(ws.root, ws.project), 'board'));
			if (board) return board;
		}
		const around = plugin.index.boardContaining(notePath);
		if (around) return around;
	}
	return boards[0] ?? null;
}

export class NewCardModal extends Modal {
	private title = '';
	private type: string;
	private board: Board | null = null;

	constructor(
		private readonly plugin: KeelKeysPlugin,
		private readonly boards: Board[],
		initialBoard: Board | null,
	) {
		super(plugin.app);
		this.type = plugin.settings.defaultType;
		this.board = initialBoard ?? boards[0] ?? null;
	}

	onOpen(): void {
		this.setTitle('New card');
		const { contentEl } = this;

		new Setting(contentEl).setName('Board').addDropdown((drop) => {
			for (const b of this.boards) drop.addOption(b.dir, boardLabel(b) + (isWritable(b) ? '' : ' — read-only'));
			if (this.board) drop.setValue(this.board.dir);
			drop.onChange((dir) => {
				this.board = this.boards.find((b) => b.dir === dir) ?? null;
			});
		});

		new Setting(contentEl).setName('Title').addText((text) => {
			text.setPlaceholder('What the card is about');
			text.onChange((v) => (this.title = v));
			text.inputEl.addEventListener('keydown', (evt) => {
				if (evt.key === 'Enter' && !evt.isComposing) {
					evt.preventDefault();
					void this.submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});

		new Setting(contentEl)
			.setName('Type')
			.setDesc('A lower-case word such as task, feature, bug or chore.')
			.addText((text) => {
				text.setValue(this.type);
				text.onChange((v) => (this.type = v));
			});

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText('Create')
				.setCta()
				.onClick(() => void this.submit()),
		);
	}

	private async submit(): Promise<void> {
		const title = this.title.trim();
		const type = this.type.trim().toLowerCase() || this.plugin.settings.defaultType;
		if (!this.board) {
			new Notice('Pick a board first.');
			return;
		}
		if (!title) {
			new Notice('Give the card a title.');
			return;
		}
		try {
			const file = await createCard(this.plugin, this.board, title, type);
			this.close();
			await this.plugin.app.workspace.getLeaf(false).openFile(file);
			new Notice(`Created ${idFromFilename(file.path)?.id ?? file.basename}.`);
		} catch (err) {
			new Notice(err instanceof Error ? err.message : String(err));
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
