# Starfall Arcade — Version 1 Full Website Update

This is the full Version 1 Starfall Arcade hub update. **Keep the public version at Version 1 unless an explicit version change is decided later.**

## Major features
- Premium Stable Empire Version 1 cover and release page
- Searchable game library
- Browser-local player profiles
- Browser-local achievements and arcade points
- Continue Playing / recent launch tracking
- Recent local hub activity
- Updates/news system
- Public roadmap
- Community hub prepared for Discord
- Future leaderboards page with no fake rankings
- Supporter-program planning page
- SEO/social sharing metadata
- sitemap, robots.txt, manifest, custom 404
- Mobile navigation and accessibility improvements

## Important profile limitation
The Version 1 player profile is **local to the current browser/device**. It is not authentication and does not sync online. Real accounts require a backend and are listed on the roadmap.

## Stable Empire save safety
The Starfall Arcade hub does not read or modify Stable Empire save data. It only stores local hub activity such as the last game link launched.

## Discord
Edit `site-config.js` and set:
```js
discord: "https://discord.gg/YOUR-INVITE"
```
All Discord buttons then point to the same invite.

## Upload to GitHub
Upload the contents of this folder to the root of `Itzreynolds/starfall-arcade`, replacing older site files when GitHub prompts. Commit directly to `main`. GitHub Pages should redeploy automatically.
