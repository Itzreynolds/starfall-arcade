# Starfall Arcade — Version 1 Platform

This is the full **Starfall Arcade Version 1** platform foundation.

It upgrades the site from a static game hub into an account-ready architecture with:

- player registration and login
- password reset
- player profiles and avatars
- My Arcade dashboard
- recent activity
- achievements and Arcade XP
- cloud-save tables
- rolling save backups
- Starfall Inbox
- queued announcement email delivery
- Premium/store architecture
- Stripe Checkout + webhook functions
- account entitlements
- subscription records
- Owner/Staff Control Center
- user search
- moderation
- manual entitlement grants
- staff roles and permissions
- analytics overview
- announcements
- audit logs
- game integration SDK
- Privacy / Terms / Refund starter pages

## Public version

Starfall Arcade is **Version 1**.

Stable Empire is **Version 1**.

Nothing in this package changes Stable Empire itself.

## Upload

Upload the contents of this folder to the root of:

`Itzreynolds/starfall-arcade`

GitHub Pages can continue deploying from `main` → `/(root)`.

## Required next step

Read:

`docs/SETUP.md`

The frontend is upload-ready, but real accounts and backend operations require a Supabase project.

## Backend

Database schema:

`supabase/migrations/001_starfall_platform.sql`

Owner bootstrap:

`supabase/migrations/002_bootstrap_owner.sql`

Edge Functions:

`supabase/functions/`

## Stable Empire

Integration instructions are included but are intentionally not applied:

`docs/STABLE-EMPIRE-INTEGRATION.md`
