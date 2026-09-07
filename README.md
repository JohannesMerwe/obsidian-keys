# Keel Keys

Ticket-style ids like BOARD-1 as first-class objects in your vault. Jira keys without Jira.

**Obsidian plugin** · id `keel-keys` · status: beta, not yet on the registry · MIT

Type `KB-3` anywhere and it becomes a link with a hover preview of the card's title, state
and column; nothing is written to your note. Autocomplete ids from the boards in the current
workspace. Create the next card with a minted id from the board's manifest. Resolve
cross-project links. Works on any vault that keeps cards as `<PREFIX>-<N>-<slug>.md` files.

## Part of a family

Keel Keys is one of the keel Obsidian plugins, five open-source plugins that make Obsidian a
better surface for working with AI coding agents on a vault of specs, plans and boards. Each
plugin stands alone; together they follow one integration spec. They light up extra features
in a vault managed by [keel](https://github.com/JohannesMerwe/pangolin-keel), and stay useful
without it.

| Plugin | Does |
|---|---|
| [Keel Open Questions](https://github.com/JohannesMerwe/obsidian-open-questions) | agents ask questions in your notes; you answer with a click; decisions get logged |
| [Keel Board](https://github.com/JohannesMerwe/obsidian-board) | kanban over a folder of markdown cards; dragging moves the file |
| [Keel Cockpit](https://github.com/JohannesMerwe/obsidian-cockpit) | session context, keel verbs and handoff diff inside the vault |
| [Keel Keys](https://github.com/JohannesMerwe/obsidian-keys) | ticket-style ids as links, autocomplete and next-number creation |
| [Keel Diagram](https://github.com/JohannesMerwe/obsidian-diagram) | edit Mermaid and D2 in place; text stays the source of truth |

This plugin owns the id grammar, resolution and minting rules (SPEC-integration §C4).

## What it does

- **Resolves ids.** Grammar `^[A-Z][A-Z0-9]{1,7}-\d+$`. A board is any directory with a
  `board.json` (pangolin-board's format), or, without one, a `board/` directory holding
  `<PREFIX>-<N>-<slug>.md` files. Ids resolve inside the note's keel workspace first (the
  nearest `keel.json` above it), then across the vault; that fallback is a setting.
- **Decorates bare ids** in Live Preview, Source mode and reading view as links with a hover
  preview of the card's title, state and column. Never inside links, code or frontmatter;
  nothing is written to the note. In the editor, Cmd/Ctrl+click opens the card so a plain
  click still places the cursor; in reading view a click opens it.
- **Autocompletes ids** when you type a known prefix (`KK`, `KK-`, `KK-1`), newest first.
- **New card** (command palette) mints the next id from the board's `board.json` (`next`
  is the only counter: read fresh, write `next + 1`, then create the file), or from the
  highest existing number when the board has no manifest, writes the frontmatter the format
  asks for, and opens the file. Boards mirrored from another tracker (`provider: jira`) are
  read-only.
- Reads both card shapes: frontmatter, and the older bold header lines plus the directory.
  The file's directory is the truth for column and state.

Commands: **New card**, **Rebuild ID index**. Settings: decoration per view, hover preview,
cross-workspace resolution, default card type.

## Principles

- Plain markdown first. No keel required.
- Integration with agents is files, not API calls. No keys, no network, no telemetry.
- Pure core in `src/core/` with no `obsidian` import, unit-tested; a thin Obsidian shell around it.

## Develop

```sh
npm install
npm run dev      # esbuild watch → main.js
npm run build    # tsc + esbuild production
npm run lint
npm test         # vitest over src/core
```

Point a throwaway dev vault's `.obsidian/plugins/keel-keys/` at this directory (or symlink
`main.js`, `manifest.json`, `styles.css`) and use the hot-reload plugin. Releases are
GitHub releases whose tag equals the `manifest.json` version; the workflow in
`.github/workflows/release.yml` builds and attaches the artifacts. Beta installs through BRAT.

## Install

Until the plugin is on the community registry, install it with
[BRAT](https://github.com/TfTHacker/obsidian42-brat): *Add beta plugin* →
`JohannesMerwe/obsidian-keys`. Requires Obsidian 1.13.0 or later.

## Agent skills

`agent/` holds the same instructions in two formats, telling an agent how to write ids that
resolve, how to mint a new one through `board.json`'s `next` counter (read fresh, write back,
then create the file), and what it must never do — reuse, renumber or invent an id:

- `agent/claude/keel-keys/SKILL.md` — copy the folder into `.claude/skills/`.
- `agent/copilot/keel-keys.prompt.md` — copy into `.github/prompts/`.

Keel links them for you once its skills linking lands.
