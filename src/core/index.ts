/**
 * The id index (SPEC §C4): prefix → board, id → file. Built from `board.json`
 * files under each workspace root, or by scanning `board/` directories when
 * there is no manifest. The Obsidian shell owns invalidation (vault events) and
 * hands in a FileSource; everything here is pure and testable.
 */
import { CardMeta, parseCard } from './card';
import { idFromFilename, parseId } from './ids';
import { BoardColumn, BoardManifest, DEFAULT_COLUMNS, parseManifest } from './manifest';
import { dirname, findWorkspaceRoot } from './workspace';

export interface FileSource {
	/** Every file path in the vault (any extension), vault-relative. */
	listPaths(): string[];
	read(path: string): Promise<string>;
}

export interface Board {
	/** Board directory, vault-relative. */
	dir: string;
	/** The minting prefix. */
	prefix: string;
	/** Every prefix this board resolves: `prefix` first, then the manifest's `prefixes`. */
	prefixes: string[];
	manifest: BoardManifest | null;
	columns: readonly BoardColumn[];
	/** Nearest keel.json directory above the board, or null in plain mode. */
	workspaceRoot: string | null;
	/** Card id → file path. */
	cards: Map<string, string>;
}

export interface Resolved {
	board: Board;
	path: string;
}

export interface IndexOptions {
	/** Fall back to boards in other workspaces when the note's own workspace has no board for a prefix. Default true. */
	crossWorkspace?: boolean;
}

export interface KnownId {
	id: string;
	path: string;
	board: Board;
}

function isUnder(path: string, dir: string): boolean {
	return dir === '' || path.startsWith(dir + '/');
}

/** The nearest `board` segment above a file, as a directory path; null when there is none. */
function boardDirFor(path: string): string | null {
	const segments = dirname(path).split('/');
	const i = segments.lastIndexOf('board');
	return i < 0 ? null : segments.slice(0, i + 1).join('/');
}

export class BoardIndex {
	private boardList: Board[] = [];
	private byPrefix = new Map<string, Board[]>();
	private keelRoots = new Set<string>();
	private metaCache = new Map<string, CardMeta>();
	private dirty = true;
	private building: Promise<void> | null = null;
	/** Incremented on every rebuild so views can tell whether to redraw. */
	generation = 0;

	constructor(
		private readonly source: FileSource,
		public options: IndexOptions = {},
	) {}

	/** Mark the structure stale (create/delete/rename) and/or forget one file's metadata (modify). */
	invalidate(path?: string, structural = true): void {
		if (structural) this.dirty = true;
		if (path !== undefined) this.metaCache.delete(path);
	}

	get isDirty(): boolean {
		return this.dirty;
	}

	/** Rebuild when stale. Concurrent callers share one build. */
	ensure(): Promise<void> {
		if (!this.dirty) return Promise.resolve();
		if (!this.building) {
			this.building = this.build().finally(() => {
				this.building = null;
			});
		}
		return this.building;
	}

	private async build(): Promise<void> {
		this.dirty = false;
		const paths = this.source.listPaths();
		const roots = new Set<string>();
		for (const p of paths) if (p === 'keel.json' || p.endsWith('/keel.json')) roots.add(dirname(p));

		const boards = new Map<string, Board>();
		const manifestBoards = new Map<string, Board>();
		for (const p of paths) {
			if (p !== 'board.json' && !p.endsWith('/board.json')) continue;
			let manifest: BoardManifest | null = null;
			try {
				manifest = parseManifest(await this.source.read(p));
			} catch {
				manifest = null;
			}
			if (!manifest) continue;
			const dir = dirname(p);
			const board: Board = {
				dir,
				prefix: manifest.prefix,
				prefixes: [manifest.prefix, ...manifest.prefixes],
				manifest,
				columns: manifest.columns,
				workspaceRoot: findWorkspaceRoot(p, (d) => roots.has(d)),
				cards: new Map(),
			};
			manifestBoards.set(dir, board);
			boards.set(dir, board);
		}

		for (const p of paths) {
			if (!p.endsWith('.md')) continue;
			const parsed = idFromFilename(p);
			if (!parsed) continue;
			// The nearest manifest board above the file owns it when it lists the prefix.
			let owner: Board | undefined;
			for (const [dir, b] of manifestBoards) {
				if (isUnder(p, dir) && b.prefixes.includes(parsed.prefix) && (!owner || dir.length > owner.dir.length)) owner = b;
			}
			if (!owner) {
				const dir = boardDirFor(p);
				if (dir === null || manifestBoards.has(dir)) continue;
				const key = `${dir}|${parsed.prefix}`;
				owner = boards.get(key);
				if (!owner) {
					owner = {
						dir,
						prefix: parsed.prefix,
						prefixes: [parsed.prefix],
						manifest: null,
						columns: DEFAULT_COLUMNS,
						workspaceRoot: findWorkspaceRoot(p, (d) => roots.has(d)),
						cards: new Map(),
					};
					boards.set(key, owner);
				}
			}
			if (!owner.cards.has(parsed.id)) owner.cards.set(parsed.id, p);
		}

		const list = [...boards.values()].sort((a, b) => a.dir.localeCompare(b.dir) || a.prefix.localeCompare(b.prefix));
		const byPrefix = new Map<string, Board[]>();
		for (const b of list) {
			for (const prefix of b.prefixes) {
				const arr = byPrefix.get(prefix) ?? [];
				arr.push(b);
				byPrefix.set(prefix, arr);
			}
		}
		this.boardList = list;
		this.byPrefix = byPrefix;
		this.keelRoots = roots;
		const live = new Set(paths);
		for (const k of this.metaCache.keys()) if (!live.has(k)) this.metaCache.delete(k);
		this.generation++;
	}

	boards(): readonly Board[] {
		return this.boardList;
	}

	/** Workspace root of a note per §C1, from the roots seen at the last build. */
	workspaceRootOf(notePath: string): string | null {
		return findWorkspaceRoot(notePath, (d) => this.keelRoots.has(d));
	}

	/** Boards visible from a note: its own workspace (or, in plain mode, boards outside any workspace) first, then the rest when cross-workspace is on. */
	boardsFor(notePath: string): Board[] {
		const root = this.workspaceRootOf(notePath);
		const own = this.boardList.filter((b) => b.workspaceRoot === root);
		if (this.options.crossWorkspace === false) return own;
		return [...own, ...this.boardList.filter((b) => b.workspaceRoot !== root)];
	}

	boardForPrefix(prefix: string, notePath: string): Board | null {
		const candidates = this.byPrefix.get(prefix);
		if (!candidates?.length) return null;
		const root = this.workspaceRootOf(notePath);
		const own = candidates.find((b) => b.workspaceRoot === root);
		if (own) return own;
		if (this.options.crossWorkspace === false) return null;
		return candidates[0] ?? null;
	}

	/** The board living at exactly this directory (a manifest board, or the first scanned one). */
	boardAt(dir: string): Board | null {
		return this.boardList.find((b) => b.dir === dir) ?? null;
	}

	/** The board a note belongs to: the nearest board directory above it, if indexed. */
	boardContaining(notePath: string): Board | null {
		let best: Board | null = null;
		for (const b of this.boardList) if (isUnder(notePath, b.dir) && (!best || b.dir.length > best.dir.length)) best = b;
		return best;
	}

	resolve(id: string, notePath: string): Resolved | null {
		const parsed = parseId(id);
		if (!parsed) return null;
		const board = this.boardForPrefix(parsed.prefix, notePath);
		const path = board?.cards.get(parsed.id);
		return board && path ? { board, path } : null;
	}

	/** Every id visible from a note: first board wins a prefix; per board, newest number first. */
	allIds(notePath: string): KnownId[] {
		const out: KnownId[] = [];
		const claimed = new Set<string>();
		for (const board of this.boardsFor(notePath)) {
			const mine = board.prefixes.filter((p) => !claimed.has(p));
			for (const p of mine) claimed.add(p);
			const entries = [...board.cards.entries()]
				.map(([id, path]) => ({ id, path, board, parsed: parseId(id) }))
				.filter((e) => e.parsed && mine.includes(e.parsed.prefix))
				.sort((a, b) => (a.parsed && b.parsed && a.parsed.prefix === b.parsed.prefix ? b.parsed.number - a.parsed.number : a.id.localeCompare(b.id)));
			for (const e of entries) out.push({ id: e.id, path: e.path, board });
		}
		return out;
	}

	/** Parsed metadata for a card file, cached until `invalidate(path, false)`. */
	async card(path: string): Promise<CardMeta | null> {
		const cached = this.metaCache.get(path);
		if (cached) return cached;
		const board = this.boardContaining(path);
		let content: string;
		try {
			content = await this.source.read(path);
		} catch {
			return null;
		}
		const meta = parseCard(path, content, board?.dir ?? dirname(path), board?.columns ?? DEFAULT_COLUMNS);
		if (meta) this.metaCache.set(path, meta);
		return meta;
	}

	/** Highest number minted for `prefix` on a board (0 when none), for manifest-less minting. */
	maxNumber(board: Board, prefix = board.prefix): number {
		let max = 0;
		for (const id of board.cards.keys()) {
			const parsed = parseId(id);
			if (parsed && parsed.prefix === prefix && parsed.number > max) max = parsed.number;
		}
		return max;
	}
}
