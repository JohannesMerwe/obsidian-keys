import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import type KeelKeysPlugin from './main';

export interface KeelKeysSettings {
	decorateEditor: boolean;
	decorateReading: boolean;
	hoverPreview: boolean;
	crossWorkspace: boolean;
	defaultType: string;
}

export const DEFAULT_SETTINGS: KeelKeysSettings = {
	decorateEditor: true,
	decorateReading: true,
	hoverPreview: true,
	crossWorkspace: true,
	defaultType: 'task',
};

export function loadSettings(data: unknown): KeelKeysSettings {
	const raw = typeof data === 'object' && data !== null ? (data as Partial<Record<keyof KeelKeysSettings, unknown>>) : {};
	const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
	return {
		decorateEditor: bool(raw.decorateEditor, DEFAULT_SETTINGS.decorateEditor),
		decorateReading: bool(raw.decorateReading, DEFAULT_SETTINGS.decorateReading),
		hoverPreview: bool(raw.hoverPreview, DEFAULT_SETTINGS.hoverPreview),
		crossWorkspace: bool(raw.crossWorkspace, DEFAULT_SETTINGS.crossWorkspace),
		defaultType: typeof raw.defaultType === 'string' && raw.defaultType.trim() ? raw.defaultType.trim() : DEFAULT_SETTINGS.defaultType,
	};
}

type Key = keyof KeelKeysSettings;

/** Declarative settings (Obsidian 1.13): definitions only; Obsidian renders, persists and indexes them for search. */
export class KeelKeysSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly keys: KeelKeysPlugin,
	) {
		super(app, keys);
	}

	getSettingDefinitions(): SettingDefinitionItem<Key>[] {
		return [
			{
				name: 'Decorate IDs in the editor',
				desc: 'Show bare IDs such as KK-1 as links in Live Preview and Source mode.',
				control: { type: 'toggle', key: 'decorateEditor', defaultValue: DEFAULT_SETTINGS.decorateEditor },
			},
			{
				name: 'Decorate IDs in reading view',
				desc: 'Show bare IDs as links when a note is rendered.',
				control: { type: 'toggle', key: 'decorateReading', defaultValue: DEFAULT_SETTINGS.decorateReading },
			},
			{
				name: 'Hover preview',
				desc: 'Show the card title, state and column when hovering an ID.',
				control: { type: 'toggle', key: 'hoverPreview', defaultValue: DEFAULT_SETTINGS.hoverPreview },
			},
			{
				name: 'Resolve IDs across workspaces',
				desc: 'When the note’s own workspace has no board for a prefix, look in the other workspaces of this vault.',
				control: { type: 'toggle', key: 'crossWorkspace', defaultValue: DEFAULT_SETTINGS.crossWorkspace },
			},
			{
				name: 'Default card type',
				desc: 'The type written into the frontmatter of a new card, for example task, feature or bug.',
				control: { type: 'text', key: 'defaultType', defaultValue: DEFAULT_SETTINGS.defaultType, placeholder: 'task' },
			},
		];
	}

	getControlValue(key: string): unknown {
		return this.keys.settings[key as Key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const next = loadSettings({ ...this.keys.settings, [key]: value });
		await this.keys.applySettings(next);
	}
}
