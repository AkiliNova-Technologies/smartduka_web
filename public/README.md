# Mwezora responsive-brand logo assets — V2

## Contents
- `mwezora-bag-adaptive.svg`: vector bag/sweep symbol; color uses `--mwezora-accent` with `currentColor` fallback.
- `mwezora-wordmark-adaptive.svg`: full **outlined vector** wordmark; `Mwe` and `zora` are separate groups with independent color tokens.
- `mwezora-horizontal-adaptive.svg`: bag plus vector wordmark.
- `*-classic.svg`: self-contained static classic-color exports, suitable for `<img>` and offline assets.
- `mwezora-app-{classic,dark,light}.svg` and matching 1024px PNG files: fixed-color OS/app-store icons.
- `MwezoraLogo.tsx`: drop-in inline React component for *live theme reactivity*.

## Theme integration
The component uses `--mwezora-logo-accent` falling back to `--primary` and `--mwezora-logo-foreground` falling back to `currentColor`.
**Verify `--primary` resolves to a CSS color**. In some Tailwind/shadcn setups this token stores HSL channels instead. If so, map it to `hsl(var(--primary))` or your existing semantic primary token instead. Do not introduce a second theme provider.

```css
/* Example only; adapt to actual project tokens */
.mwezora-brand { --mwezora-logo-foreground: var(--foreground); --mwezora-logo-accent: var(--primary); }
```

The component is an inline SVG symbol and HTML text for the live wordmark. The SVG exports instead contain outlined letter shapes and can be recolored when **inlined** in the DOM. **SVG `<img src>` cannot inherit parent theme CSS variables.** Use the React component for the header, not a static external `img` tag.

App icon home-screen graphics are **static exports**, not live-theme-responsive. OS-level dynamic icons require additional native platform setup.

## Notes
- This is an original clean vector *interpretation* of the flowing-bag reference, not an exact pixel trace.
- These files use no embedded raster imagery or packaged font files.
- Logo should be checked in your actual header against light/dark, accent changes, and at 20–32px.
- Keep logo SVG role and accessible name on its component, and preserve contrast for custom colors.
- Logo is not yet cleared for trademark distinctiveness.
