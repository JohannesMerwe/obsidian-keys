/** New-card file naming and content (SPEC §C3 frontmatter). Pure. */
import { Board } from './index';
import { BoardColumn, CardState, columnDir } from './manifest';

export function slugify(title: string, max = 60): string {
	const slug = title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (slug.length <= max) return slug;
	const cut = slug.slice(0, max);
	const i = cut.lastIndexOf('-');
	return (i > max / 2 ? cut.slice(0, i) : cut).replace(/-+$/, '');
}

export function cardFileName(id: string, title: string): string {
	const slug = slugify(title);
	return slug ? `${id}-${slug}.md` : `${id}.md`;
}

/** First column whose state is `todo`, else the first column. */
export function entryColumn(columns: readonly BoardColumn[]): BoardColumn {
	return columns.find((c) => c.state === 'todo') ?? columns[0] ?? { dir: 'backlog', title: 'Backlog', state: 'todo' };
}

/** Directory a new card lands in, `{year}` resolved. */
export function newCardDir(board: Board, column: BoardColumn, year: number): string {
	const rel = columnDir(column, year);
	return board.dir === '' ? rel : `${board.dir}/${rel}`;
}

function yamlScalar(value: string): string {
	if (value === '') return '""';
	if (/^[\w./-]+$/.test(value) && !/^(true|false|null|yes|no|~)$/i.test(value) && !/^\d/.test(value)) return value;
	if (/[:#'"[\]{}&*!|>%@`,?-]|^\s|\s$/.test(value) || /^(true|false|null|yes|no|~)$/i.test(value) || /^[\d.-]/.test(value)) {
		return JSON.stringify(value);
	}
	return value;
}

export interface NewCardInput {
	id: string;
	title: string;
	state: CardState;
	/** Column dir as declared in the manifest (`backlog`, `done/{year}` is unlikely for a new card). */
	column: string;
	type: string;
	/** ISO date `YYYY-MM-DD`. */
	date: string;
}

export function cardContent(input: NewCardInput): string {
	const lines = [
		'---',
		`id: ${input.id}`,
		`title: ${yamlScalar(input.title)}`,
		`state: ${input.state}`,
		`column: ${yamlScalar(input.column)}`,
		`type: ${yamlScalar(input.type)}`,
		`created: ${input.date}`,
		`updated: ${input.date}`,
		'links: []',
		'---',
		'',
		`# ${input.id} — ${input.title}`,
		'',
	];
	return lines.join('\n');
}

export function isoDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}
