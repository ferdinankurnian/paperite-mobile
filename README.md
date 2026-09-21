# paperite-mobile

**paperite-mobile** is just another note-taking app in mobile.

This project is the mobile version of Paperite, with UI and interaction patterns designed specifically for a mobile experience. The original desktop version of Paperite can be found at [ferdinankurnian/paperite](https://github.com/ferdinankurnian/paperite).

## UI: ashoff

paperite-mobile has its own design system called **ashoff**. Ashoff was designed specifically to keep the visual language, spacing, typography, interactions, and behavior consistent across the app.

When creating or modifying a page:

- use the existing ashoff components in `components/ui`;
- use existing app components when they already cover the page's needs;
- do not use native components directly to build page UI;
- do not create a new custom component when the need can be covered or standardized through ashoff.

The main UI components currently include `Button`, `Card`, `Drawer`, `Input`, `SearchBar`, `Toolbar`, `ToolbarMenu`, `ToolbarTitle`, and `MaterialSymbol`.

## Tech stack

- Expo and React Native
- Expo Router
- TypeScript
- NativeWind
- React Native Paper
- TipTap for the note editor
- Expo SQLite and filesystem storage for local data

## Development

Install dependencies using Bun:

```bash
bun install
```

Available commands:

```bash
bun run start          # start Expo
bun run android        # run the Android app
bun run ios            # run the iOS app
bun run web            # run the web app
bun run build:editor   # build the web editor
bun run lint           # lint and check formatting
```

## Important structure

```text
app/              Expo Router routes and screens
components/ui/    ashoff design system components
components/app/   feature and app composition components
lib/              state, storage, editor, and utilities
theme/            colors and visual tokens
editor-web/       TipTap web editor assets
```

## Contributing

Before adding new UI, first look for the ashoff component that is closest to the requirement. If one does not exist, consider extending ashoff with a reusable pattern instead of creating a page-specific ad-hoc component. Detailed rules for agents and contributors are documented in [`AGENTS.md`](./AGENTS.md).
