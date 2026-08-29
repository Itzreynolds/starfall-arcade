# Starfall Arcade Architecture — Version 1

```text
Player Browser
   |
   +-- Starfall Arcade (GitHub Pages)
   |      |
   |      +-- Auth / Profiles / Inbox / Dashboard
   |      +-- Premium & Store UI
   |      +-- Owner / Staff Control Center
   |
   +-- Stable Empire / Future Games
          |
          +-- Starfall Game SDK
                 |
                 v
            Supabase
            ├─ Auth
            ├─ PostgreSQL
            ├─ Row Level Security
            ├─ Avatar Storage
            └─ Edge Functions
                  |
                  +-- Stripe Checkout
                  +-- Stripe Webhooks
                  +-- Resend Email Queue
```

## Trust boundaries

### Public browser
Untrusted.

May contain:
- Supabase Project URL
- Supabase anon key
- public game code

Must never contain:
- service-role key
- Stripe secret
- webhook secret
- Resend API key

### Supabase
Trusted backend.

Responsible for:
- account identity
- ownership checks
- cloud save ownership
- staff permissions
- moderation
- entitlements
- audit logging

### Stripe
Payment authority.

A browser redirect is never enough to grant paid content.

Only a verified Stripe webhook should create paid entitlements.

### Games
Browser games are untrusted clients.

Cloud-save ownership is secure because RLS ties saves to the authenticated account.

Competitive achievements or high-value rewards need server validation if cheating would matter.
