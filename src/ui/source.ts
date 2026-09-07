import { TFile, Vault } from 'obsidian';
import { FileSource } from '../core/index';

/** FileSource over the Obsidian vault. Dotfolders (`.keel/`, `.code/`) are never loaded by Obsidian, so they are never scanned. */
export class VaultSource implements FileSource {
	constructor(private readonly vault: Vault) {}

	listPaths(): string[] {
		const out: string[] = [];
		for (const f of this.vault.getAllLoadedFiles()) if (f instanceof TFile) out.push(f.path);
		return out;
	}

	read(path: string): Promise<string> {
		const file = this.vault.getFileByPath(path);
		if (!file) return Promise.reject(new Error(`No file at ${path}`));
		return this.vault.cachedRead(file);
	}
}
