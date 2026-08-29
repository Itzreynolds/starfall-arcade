# Stable Empire → Starfall Account Integration Plan

**Important:** This package does not modify Stable Empire.

Stable Empire remains **Version 1** until the owner explicitly changes the public version.

The existing local save key must remain:

`stableEmpireSave_v1`

## Goal

When integration is approved later, a signed-in player should be able to:

1. Keep using their existing browser save.
2. Detect that local save.
3. Choose whether to import it to Starfall Cloud.
4. Continue saving locally for resilience.
5. Sync a copy to their Starfall account.
6. Restore from Starfall Cloud on another device after signing in.
7. Keep rolling cloud backups.

## Recommended migration prompt

When a signed-in Starfall player opens Stable Empire and no cloud save exists:

> Existing Stable Empire save found.
> Would you like to connect this save to your Starfall account?
>
> Your current browser save will not be deleted.

Buttons:
- Connect to Starfall Cloud
- Not now

Never overwrite a newer local save automatically without showing the player the timestamps first.

## SDK

Use:

`sdk/starfall-game-sdk.js`

Example:

```js
import { StarfallGameSDK } from "https://itzreynolds.github.io/starfall-arcade/sdk/starfall-game-sdk.js";

const starfall = new StarfallGameSDK({
  supabaseUrl: "YOUR_SUPABASE_URL",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  gameId: "stable-empire",
  saveVersion: "1"
});
```

### Import the existing local save

```js
const raw = localStorage.getItem("stableEmpireSave_v1");
if (raw) {
  const parsed = JSON.parse(raw);
  await starfall.save("main", parsed);
  await starfall.event("cloud_save", { imported_existing_save: true });
}
```

### Load cloud save

```js
const cloud = await starfall.load("main");
if (cloud?.save_data) {
  // Compare local and cloud timestamps before deciding which copy to use.
}
```

## Activity events

Useful low-risk activity examples:

- `game_launch`
- `horse_purchased`
- `horse_trained`
- `competition_won`
- `story_chapter_completed`
- `facility_upgraded`
- `cloud_save`

Activity is useful for player history and analytics.

For competitive rewards or valuable paid entitlements, do not trust browser-supplied events by themselves. Browser clients can be manipulated. High-value rewards should eventually be validated by a trusted server-side rule or game server.

## Entitlements

The SDK can check:

```js
await starfall.owns("stable-empire.expansion.example")
```

That allows future expansions or cosmetics to be tied to the Starfall account.

Do not unlock paid content from a client-side flag alone.

## Save safety

During future integration:
- keep the local save
- cloud-save asynchronously
- never block normal saving because cloud sync failed
- retain cloud backups
- display sync status
- provide a manual export option
- never change the existing save key during migration
