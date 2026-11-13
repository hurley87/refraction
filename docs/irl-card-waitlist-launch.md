# IRL Card waitlist — launch checklist

Setup steps for the IRL Card waitlist at `/irl-card/waitlist` before it goes live. The page works without these (signups are stored), but welcome emails and list sync stay `pending` until Campaign Monitor is configured.

## 1. Run the database migration

Run `database/irl-card-waitlist-schema.sql` against Supabase (SQL editor). It creates:

- `irl_card_waitlist_signups` (one row per normalized email)
- `claim_irl_card_welcome_send(...)`, the atomic claim that prevents duplicate welcome emails
- Indexes, the `updated_at` trigger, and the service-role RLS policy

The script is idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`), so re-running it is safe.

## 2. Create the welcome smart email in Campaign Monitor

1. Campaign Monitor → **Transactional** → **Smart email** → create a new email.
2. Use these data fields in the template:
   - `exploreUrl` — link to the IRL map (`/interactive-map?utm_source=irl-card-waitlist&utm_medium=email`)
   - `shareUrl` — link to share the waitlist (`/irl-card/waitlist?utm_source=waitlist-share&utm_medium=share`)
3. Welcome email copy is **pending approval**. Do not claim rates, yield, benefits, or referral rewards.
4. Copy the smart email ID from the email's page.

The app sends with `AddRecipientsToList: false`, so the welcome email never subscribes anyone to a list on its own.

## 3. Create the IRL Card list in Campaign Monitor

1. Create a new list, e.g. **IRL Card waitlist**.
2. Add these custom fields (exact names):
   - `City` (text)
   - `Country` (text, ISO 3166-1 alpha-2, e.g. `CA`)
   - `AlreadyUsesIRL` (text, `Yes` / `No`)
3. Copy the **List API ID** from the bottom of the list's Settings page.

Only signups that tick the marketing consent box are added. Unsubscribes are handled by Campaign Monitor; previously unsubscribed people are not resubscribed.

## 4. Set environment variables in Vercel

| Variable                                           | Value                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| `CAMPAIGN_MONITOR_API_KEY`                         | Existing key (shared with the onboarding list); Account settings → API keys |
| `CAMPAIGN_MONITOR_IRL_CARD_WELCOME_SMART_EMAIL_ID` | Smart email ID from step 2                                                  |
| `CAMPAIGN_MONITOR_IRL_CARD_LIST_ID`                | List API ID from step 3                                                     |

Redeploy after setting them. Until they are set, signups still save and emails wait as `pending` without using up retry attempts.

## 5. Confirm the retry cron

- `CRON_SECRET` must be set in Vercel. The cron route rejects requests without `Authorization: Bearer <CRON_SECRET>`.
- `vercel.json` schedules `GET /api/cron/irl-card-waitlist-retry` every 15 minutes. It retries failed or pending welcome emails and list syncs (max 5 attempts each) without sending duplicates.
- Check Vercel → **Cron Jobs** after deploy to confirm it is listed and returning 200.

## 6. Approve and swap in the pending copy

All unapproved strings live in `IRL_CARD_WAITLIST_PENDING_COPY` in `lib/irl-card/waitlist-copy.ts`:

- Validation and error messages
- Marketing consent wording and the privacy link label (currently links to `/faq#privacy`)
- Share button and toast labels

The approved page copy is in `IRL_CARD_WAITLIST_COPY` in the same file and should not change without approval. After editing, run `yarn test components/irl-card` — the form tests read from these constants.

## 7. Smoke test after deploy

1. Submit the form with a test email and consent ticked → success message appears.
2. Check the row in `irl_card_waitlist_signups` (`welcome_email_status = 'sent'`, `list_sync_status = 'synced'`).
3. Confirm the welcome email arrived once and the subscriber is on the list with City / Country / AlreadyUsesIRL.
4. Submit the same email again with different capitalization → success, no second email, no new row.
5. Check Mixpanel for `irl_card_waitlist_viewed` and `irl_card_waitlist_joined` (no email or city in properties).
6. Open the page with a venue QR link (e.g. `?utm_source=venue-qr&source=venue&source_ref=<id>`) and confirm the attribution columns are stored.
