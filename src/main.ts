import { MarkdownView, Notice, Plugin, TAbstractFile, debounce } from 'obsidian';
import { BoardIndex } from './core/index';
import { DEFAULT_SETTINGS, KeelKeysSettingTab, KeelKeysSettings, loadSettings } from './settings';
import { VaultSource } from './ui/source';

export default class KeelKeysPlugin extends Plugin {
	settings: KeelKeysSettings = DEFAULT_SETTINGS;
	index!: BoardIndex;

	private readonly refreshIndex = debounce(() => void this.rebuild(), 250, true);

	async onload(): Promise<void> {
		this.settings = loadSettings(await this.loadData());
		this.index = new BoardIndex(new VaultSource(this.app.vault), { crossWorkspace: this.settings.crossWorkspace });
		this.addSettingTab(new KeelKeysSettingTab(this.app, this));

		this.addCommand({
			id: 'rebuild-index',
			name: 'Rebuild ID index',
			callback: () => {
				this.index.invalidate();
				void this.rebuild().then(() => new Notice(`Keel Keys: ${this.index.boards().length} boards indexed.`));
			},
		});

		// Vault listeners go in after layout so startup does not fire 'create' per file.
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.vault.on('create', (f) => this.onStructuralChange(f)));
			this.registerEvent(this.app.vault.on('delete', (f) => this.onStructuralChange(f)));
			this.registerEvent(
				this.app.vault.on('rename', (f, oldPath) => {
					this.index.invalidate(oldPath, false);
					this.onStructuralChange(f);
				}),
			);
			this.registerEvent(this.app.vault.on('modify', (f) => this.onModify(f)));
			this.refreshIndex();
		});
	}

	/** Persist settings and push the ones the index and views read. */
	async applySettings(next: KeelKeysSettings): Promise<void> {
		this.settings = next;
		await this.saveData(next);
		this.index.options.crossWorkspace = next.crossWorkspace;
		this.redrawViews();
	}

	private onStructuralChange(file: TAbstractFile): void {
		this.index.invalidate(file.path, true);
		this.refreshIndex();
	}

	private onModify(file: TAbstractFile): void {
		const structural = file.name === 'board.json' || file.name === 'keel.json';
		this.index.invalidate(file.path, structural);
		if (structural) this.refreshIndex();
	}

	private async rebuild(): Promise<void> {
		if (!this.index.isDirty) return;
		await this.index.ensure();
		this.redrawViews();
	}

	/** Reconfigure editors (re-runs view plugins) and re-render reading views so decorations follow the index. */
	redrawViews(): void {
		this.app.workspace.updateOptions();
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.getMode() === 'preview') view.previewMode.rerender(true);
		}
	}
}
