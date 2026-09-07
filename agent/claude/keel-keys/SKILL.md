---
name: keel-keys
description: Write ticket-style ids (KB-3, KEEL-42) that actually resolve to a card, and mint new ones through board.json's next counter, reading it fresh and writing it back before creating the file. Use whenever you reference or create a card in a vault or repo with board directories.
---

# Keel Keys: ids are the vocabulary — resolve them, never invent them

A person working with you has the Keel Keys plugin in Obsidian. Every bare id you write into a
note — `KB-3`, `KEEL-42`, `DEMO-7` — is decorated as a link with a hover preview of that card's
title, state and column, as long as the id resolves to a real card. An id that resolves to
nothing is dead text and a small lie. This skill is about not writing those.

## The grammar

`^[A-Z][A-Z0-9]{1,7}-\d+$` — two to eight uppercase characters, a hyphen, a number. `KB-3`,
`KEEL-42`, `TCP-1204`. Nothing else is an id: not `kb-3`, not `KB_3`, not `KB-3a`.

An id is decorated wherever it appears in prose, and **not** inside a link, a code span, a code
fence or frontmatter. So write ids bare in prose (`fixed in KB-3`), and keep them bare — do not
wrap them in backticks out of habit, because that turns off the preview the person came for.

## Resolution: prefix → board, id → file

- A **board** is a directory with a `board.json` naming its `prefix`, or, without a manifest,
  a `board/` directory whose cards start with the prefix.
- A **card** is `<ID>-<slug>.md` under one of that board's column directories.
- The index is built per keel workspace (the nearest ancestor with a `keel.json`) and
  invalidated on vault changes. A prefix the workspace has no board for may fall back to
  another workspace in the vault, if the setting allows it.

Before you write an id, know which board it belongs to. Before you write an id you have not
seen, check that the file exists. `KB-3` in a note where no `KB` board is in scope reads as a
typo to the person and shows nothing on hover.

## Minting: `next` is the only counter

When you create a card, take its number the way every other writer does — the plugin's
*New card*, Keel Board's *Add card*, pangolin-board's CLI and you:

1. Read the board's `board.json` **fresh**, right now. Not a value you cached earlier in the
   session.
2. Take `next` as the id.
3. Write `next + 1` back to the manifest.
4. Then create the card file.

In that order. The write-back happens before the file exists so that a crash leaks a number
rather than handing the same number to two cards. Without a manifest, mint from the highest
existing number plus one and **do not create a manifest** — that is pangolin-board's migration
to do, not yours.

## Never reuse an id

- Never renumber a card, even to close a gap. A leaked number is free; a reused one breaks
  every reference to it, and references are the point.
- Never invent an id to point at work that has no card. Create the card, or write prose.
- Never move a card between boards by editing its id. That is a new card and a `links:` entry.
- Never guess an id from a pattern ("the next one is probably KB-6"). Read `next`.

## The card you create

Frontmatter, never bold header lines — you may **read** the old header-line shape in cards
written before the migration, but everything you write is frontmatter:

```yaml
---
id: KB-3
title: "Add card with minted id, regenerate BOARD.md"
state: todo
column: backlog
type: feature
created: 2026-09-07
updated: 2026-09-07
links: [KQ-1]
---
```

- `title:` — **quote it** if it contains a colon, or the frontmatter is not valid YAML and
  every reader, this plugin included, loses the card's title.
- `column:` is the directory the file sits in; `state:` is what that column maps to in
  `board.json` (`todo` / `in_progress` / `done`). The directory wins: move the file and update
  both fields, and never let them disagree.
- `links:` is a list of ids — the same grammar, and the same rule that each must resolve.

## Do not

- Do not write an id you have not resolved to a file.
- Do not put ids in code spans or code fences when you mean them as references.
- Do not edit `BOARD.md`; it is generated from the cards and the manifest.
- Do not invent a prefix. Prefixes come from `board.json`, one per board.
- Do not renumber, reuse, or recycle.
