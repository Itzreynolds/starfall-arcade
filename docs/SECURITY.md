# Starfall Security Notes

## Never expose secrets in GitHub Pages

Safe in frontend:
- Supabase Project URL
- Supabase public anon key
- Stripe publishable key if you later need one

Never in frontend:
- Supabase service-role key
- database password
- Stripe secret key
- Stripe webhook secret
- Resend API key

## Staff access

The Control Center UI is not the security boundary.

Security is enforced by:
- Supabase Auth
- Row Level Security
- security-definer RPC functions
- staff role checks
- server-side Edge Functions
- Stripe webhook signature verification

Changing browser JavaScript cannot turn a normal player into an Owner.

## Audit trail

Sensitive staff actions should always create an `audit_logs` row.

Do not add future admin mutations without also adding an audit record.

## Game clients

A browser game is an untrusted client.

Players can inspect and manipulate browser JavaScript. Therefore:
- cloud-save ownership can be securely enforced by account ID
- purchase entitlements can be securely enforced through webhooks
- high-value achievement/reward conditions should not rely exclusively on a browser claiming "I won"
