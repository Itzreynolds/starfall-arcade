# Starfall Arcade

**A universe of browser games.**

This repository contains the Starfall Arcade GitHub Pages website.

## Current site features

- Original Starfall Arcade logo and social sharing artwork
- Featured Stable Empire V2 release
- Full Stable Empire game page and scene gallery
- Searchable/filterable game library
- Development updates with individual news pages
- Public roadmap
- Community / Discord planning page
- Supporter-program planning page
- About page
- Responsive mobile navigation
- 404 page
- Open Graph/social metadata
- `robots.txt`, `sitemap.xml`, `.nojekyll`
- Reduced-motion accessibility support

## Add the Discord invite

Open `site-config.js` and set:

```js
discord: "https://discord.gg/YOURINVITE"
```

Every Discord button will update automatically.

## Add another game

Add a new game object to the `games` array in `site-config.js`. Use a dedicated page when the game is ready for a real reveal.

## Live URLs

Starfall Arcade:
`https://itzreynolds.github.io/starfall-arcade/`

Stable Empire:
`https://itzreynolds.github.io/stable-empire/`

## Uploading this update

Upload the **contents** of this folder to the root of `Itzreynolds/starfall-arcade` and replace the older website files when GitHub asks.
