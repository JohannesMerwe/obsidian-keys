/**
 * Workspace and project detection (SPEC-integration §C1).
 * Paths are vault-relative, '/'-separated; the vault root is ''.
 * Pure: the caller injects how to test for keel.json and how to read it.
 */

export interface WorkspaceInfo {
	/** Nearest ancestor directory holding `keel.json` ('' is the vault root). */
	root: string;
	/** First path segment below the root when `keel.json` lists a project of that name, else null. */
	project: string | null;
}

export interface KeelManifestLike {
	projects?: { name?: unknown }[];
}

export function dirname(path: string): string {
	const i = path.lastIndexOf('/');
	return i < 0 ? '' : path.slice(0, i);
}

export function joinPath(dir: string, name: string): string {
	return dir === '' ? name : `${dir}/${name}`;
}

/** Ancestor directories of `path`, nearest first, ending with the vault root ''. */
export function ancestors(path: string): string[] {
	const out: string[] = [];
	let dir = dirname(path);
	for (;;) {
		out.push(dir);
		if (dir === '') return out;
		dir = dirname(dir);
	}
}

export function findWorkspaceRoot(notePath: string, hasKeelJson: (dir: string) => boolean): string | null {
	for (const dir of ancestors(notePath)) if (hasKeelJson(dir)) return dir;
	return null;
}

export function projectNames(manifest: KeelManifestLike | null | undefined): string[] {
	const names: string[] = [];
	for (const p of manifest?.projects ?? []) if (typeof p.name === 'string') names.push(p.name);
	return names;
}

export function projectOf(notePath: string, root: string, projects: string[]): string | null {
	const rel = root === '' ? notePath : notePath.startsWith(root + '/') ? notePath.slice(root.length + 1) : null;
	if (rel === null) return null;
	const first = rel.split('/')[0] ?? '';
	return first !== rel && projects.includes(first) ? first : null;
}

export function detectWorkspace(
	notePath: string,
	hasKeelJson: (dir: string) => boolean,
	readProjects: (root: string) => string[],
): WorkspaceInfo | null {
	const root = findWorkspaceRoot(notePath, hasKeelJson);
	if (root === null) return null;
	return { root, project: projectOf(notePath, root, readProjects(root)) };
}
