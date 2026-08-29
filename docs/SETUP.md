# Starfall Arcade Version 1 — Backend Setup

This package contains the complete **platform foundation** for real accounts, cloud saves, achievements, activity tracking, inbox announcements, Premium/store entitlements, and the Owner/Staff Control Center.

The public website can be uploaded immediately. The account/platform features become live after the steps below.

## 1. Create a Supabase project

Create a new Supabase project for **Starfall Arcade**.

Keep these values private:
- database password
- service-role key

The browser website only needs:
- Project URL
- public anon key

## 2. Run the database migration

In Supabase:

**SQL Editor → New query**

Paste and run:

`supabase/migrations/001_starfall_platform.sql`

This creates:
- profiles
- game registry
- cloud saves
- rolling save backups
- activity events
- achievements
- Starfall Inbox
- products
- purchases
- entitlements
- subscriptions
- staff roles
- moderation actions
- audit logs
- secure RLS policies
- avatar storage
- Owner/Staff RPC functions

It also registers **Stable Empire — Version 1** as the first Starfall game.

## 3. Connect the website to Supabase

Open:

`assets/js/config.js`

Replace:

```js
supabaseUrl: "YOUR_SUPABASE_URL",
supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
```

with the Project URL and **public anon key** from Supabase.

Never put any of these in frontend files:
- Supabase service-role key
- Stripe secret key
- Stripe webhook secret
- Resend API key

## 4. Configure Auth URLs

In Supabase Auth URL settings set:

Site URL:

`https://itzreynolds.github.io/starfall-arcade`

Add redirect URLs:

- `https://itzreynolds.github.io/starfall-arcade/dashboard.html`
- `https://itzreynolds.github.io/starfall-arcade/reset-password.html`

Enable email/password authentication.

For production, configure your own branded email sender before sending large amounts of mail.

## 5. Create your Owner account

Upload the site, open:

`https://itzreynolds.github.io/starfall-arcade/login.html`

Create your own Starfall account and confirm the email.

Then open:

`supabase/migrations/002_bootstrap_owner.sql`

Replace:

`YOUR_OWNER_EMAIL_HERE`

with the email used for your Starfall account.

Run that file once in the SQL Editor.

Your account is now the **Owner** and can open:

`https://itzreynolds.github.io/starfall-arcade/staff/`

## 6. Deploy Edge Functions

Functions included:

- `game-event`
- `create-checkout`
- `stripe-webhook`
- `send-announcement`
- `process-email-queue`

You can deploy them with the Supabase CLI or copy each function into the Supabase Functions workflow.

### Required function secrets

Always set:

`SITE_URL=https://itzreynolds.github.io/starfall-arcade`

Supabase supplies its project URL/keys to deployed Edge Functions in normal deployments. Confirm that `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are available.

## 7. Stripe setup

Do this only when you are ready for real money.

Create Stripe products/prices for the exact things you decide to sell.

Add function secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Create a Stripe webhook pointing to the deployed:

`stripe-webhook`

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Then update the matching row in `public.products`:
- `stripe_price_id`
- `price_display`
- `active = true`

The included example Premium product is **inactive** and has **no invented price**.

### Security model

Checkout is created server-side.

Verified Stripe webhooks create:
- purchase records
- entitlements
- subscriptions
- Premium status

The browser never receives your Stripe secret key.

## 8. Resend email setup

Internal Starfall Inbox messages work without Resend.

For optional email delivery, configure Resend and set:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `EMAIL_WORKER_SECRET` (a long random secret used only by the scheduled email worker)

Use a verified sender/domain.

Announcements are queued in `email_queue` rather than trying to send thousands of emails inside the admin request.

Schedule `process-email-queue` to run regularly (for example every few minutes) and call it with:

`x-starfall-worker-secret: <EMAIL_WORKER_SECRET>`

Players can control optional announcement email through their profile preference.

The Control Center can target:
- all users
- Premium users
- players of a selected game
- users inactive 30+ days
- one specific user ID

## 9. Test before launch

Create at least:
- one normal test player
- your Owner account

Test:
- signup
- confirmation email
- login
- password reset
- profile editing
- avatar upload
- inbox
- achievements
- staff access denial for a normal player
- Owner dashboard
- user search
- moderation
- manual entitlement grant
- announcement targeting

When Stripe is connected, use Stripe test mode first.

## 10. Connect games later

The SDK is here:

`sdk/starfall-game-sdk.js`

Stable Empire itself has **not been modified** by this package.

When you explicitly decide to connect Stable Empire, use:

`docs/STABLE-EMPIRE-INTEGRATION.md`

The existing browser save key remains:

`stableEmpireSave_v1`

and should be preserved during any future migration.

## Before accepting real users

Customize and review:
- `privacy.html`
- `terms.html`
- `refund-policy.html`

Those pages are starter drafts, not legal advice.
