# Meal Timeline

Plan cooking timelines for big meals so every dish is ready on time.

- **Dishes:** each general step with its duration, hands-on or hands-off, optional oven temp.
- **Meals:** add dishes (new or from the library), set the date and time, and get a backward-scheduled, color-coded, chronological timeline.
- **Deadlines:** one serving time for everything, or a time per dish.
- **Make ahead:** finish a dish early and hold it (room temp, fridge, warm oven, freezer). "Finishing" steps such as reheating are scheduled right before serving.
- **Conflict warnings:** overlapping hands-on steps, or two different oven temperatures at once.
- **Reminders:** push notifications to your phone (even with the app closed), a few minutes before each step, plus timer alerts when hands-off steps finish.
- **Cook mode:** live now/next view with countdowns; keeps the screen awake.

Stack: Next.js on Vercel, Supabase (Postgres + pg_cron), Web Push.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | What it is |
| --- | --- |
| `APP_PASSCODE` | Your 4-digit passcode |
| `SESSION_SECRET` | Long random string used to sign the login cookie |
| `SUPABASE_URL` | Added automatically by the Vercel Supabase integration |
| `SUPABASE_SERVICE_ROLE_KEY` | Added automatically by the Vercel Supabase integration |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys (`npx web-push generate-vapid-keys`) |
| `VAPID_SUBJECT` | `mailto:you@example.com` |
| `CRON_SECRET` | Long random string; Supabase sends it when triggering reminders |

## Database setup

1. In Supabase, open **SQL Editor**, paste `supabase/schema.sql`, and run it.
2. After the app is live on its production URL, edit the two placeholders in `supabase/reminders-cron.sql` and run it. This sends due reminders every minute.

## Development workflow

Changes are made on a branch. Vercel builds a preview URL for each branch; once approved, the branch is merged into `main`, which updates the live site.
