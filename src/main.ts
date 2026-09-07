import { Notice, Plugin } from 'obsidian';

export default class KeelKeysPlugin extends Plugin {
	onload(): void {
		this.addCommand({
			id: 'status',
			name: 'Show status',
			callback: () => {
				new Notice('Keel Keys ' + this.manifest.version + ' is loaded. Nothing to show yet.');
			},
		});
	}
}
