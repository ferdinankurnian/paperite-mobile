# AGENTS.md

Guidelines for agents and contributors working on `paperite-mobile`.

## Project identity

`paperite-mobile` is **just another note-taking app in mobile**. It is the mobile version with its own UI and is related to the original desktop version of Paperite: <https://github.com/ferdinankurnian/paperite>.

## Required UI rules

This project's design system is called **ashoff**. Ashoff is more than a collection of styles; its components are the standard source for the app's visuals and interactions.

For every new page, screen, modal, sheet, toolbar, form, or UI:

1. Prioritize the existing ashoff components in `components/ui`.
2. Use feature components from `components/app` when they already represent an established app pattern.
3. Do not build page UI directly from React Native primitives such as `View`, `Text`, `Pressable`, `TextInput`, or other native components.
4. Do not create a new custom component to replace an ashoff component or to serve only one page.
5. If a requirement is not supported, extend ashoff with a reusable pattern first, then use that pattern in the page.
6. Do not introduce a new UI library or styling pattern without a strong reason and the project owner's approval.

Native components may be used as internal implementation details of ashoff components or for platform requirements that cannot be abstracted. Pages must still use the ashoff component API rather than those native components directly.

## Current ashoff components

The main reusable components live in `components/ui`:

- `Button` for primary, secondary, destructive, ghost, and icon actions;
- `Card` for standard surfaces and cards;
- `Drawer` and `ActionModal` for modal surfaces;
- `Input` and `SearchBar` for text input;
- `Toolbar`, `ToolbarMenu`, and `ToolbarTitle` for navigation and action bars;
- `MaterialSymbol` as the consistent source for UI icons.

Before coding, read the implementation and props of the relevant components. Do not manually duplicate their styles in a page.

## Working conventions

- Use TypeScript.
- Use the project import alias (`@/...`) when available.
- Use Bun to install dependencies and run scripts.
- Do not edit `package.json` directly for dependencies; use the package manager command.
- Do not edit `routeTree.gen.ts` or run a route-tree generator without explicit instructions.
- Do not change the behavior or visuals of an ashoff component for a single page without checking its impact on other usages.
- Run `bun run lint` after UI changes when possible.
- Do not start a dev server yourself; ask the project owner to start one when needed.

## Completion checklist

- The page uses ashoff components rather than native or custom components directly.
- No ad-hoc styles duplicate an ashoff component.
- Loading, empty, error, and dark mode states have been considered.
- Interactions and accessibility labels follow existing component patterns.
- The changes have been checked with the relevant linting and formatting tools.
