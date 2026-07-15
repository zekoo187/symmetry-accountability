# Symmetry Fitness — Trainer Accountability Dashboard

A weekly accountability dashboard for a personal-training studio. The **owner**
tracks every trainer's sessions, client show rate, no-shows/cancels, and client
check-ins (daily hydration + weekly weigh-in). Each **trainer** sees only their
own clients and updates their check-ins, which flow live to the owner's view.

Built from the design handoff as a **React + TypeScript** SPA (Vite) backed by
**Supabase** (Postgres + Auth + Row Level Security + an Edge Function for reminders).

---

## Two ways to run

The app has a **two-adapter data layer**. It picks automatically based on `.env`:

| Mode | When | Data | Auth |
| ---- | ---- | ---- | ---- |
| **Demo** | `.env` blank / missing | Baked-in seed data + your browser's `localStorage` | Pick a role on the login screen |
| **Live** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set | Shared Supabase Postgres | Supabase email/password |

You can build, click through, and demo the whole UI in **Demo mode with zero setup**.
Wire up Supabase whenever you want it to be real and shareable.

---

## Run it now (Demo mode)

```bash
npm install
npm run dev
```

Open the printed URL. On the login screen choose **Studio owner** (full dashboard)
or any **trainer** (their own clients only). A small "Demo data" badge shows you're
on local data. Check-in toggles and reminders persist in your browser.

> Resize the window narrow (or use your browser's device toolbar) to see the phone layout.

---

## Go live with Supabase

You'll need a free Supabase account. These steps use your own account and keys —
things I can't create for you.

### 1. Create the project & load the schema
1. Create a project at <https://supabase.com>.
2. In the dashboard: **SQL Editor → New query**, paste all of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), run it.
3. New query again, paste [`supabase/seed.sql`](supabase/seed.sql), run it.
   (This loads the same sample trainers/weeks/clients as demo mode.)

### 2. Point the app at it
1. **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. `cp .env.example .env` and paste them in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Restart `npm run dev`. The login screen switches to email/password.

### 3. Create user accounts (owner + trainers)
For each person: **Authentication → Users → Add user** (set an email + password),
then in **SQL Editor** attach a profile row.

Owner:
```sql
insert into profiles (id, role, trainer_id, display_name, email)
values ('<auth-user-uuid>', 'owner', null, 'Studio', 'studio@yourgym.com');
```

A trainer (link to their roster id — `SA` = Santiago, etc.):
```sql
insert into profiles (id, role, trainer_id, display_name, email)
values ('<auth-user-uuid>', 'trainer', 'SA', 'Santiago', 'santiago@yourgym.com');
```

Sign in as the owner to see everyone; sign in as a trainer to see only their clients.
Row Level Security enforces this at the database — a trainer literally cannot read
another trainer's rows.

### 4. Real reminders (optional)
The "nudge" / "Send reminders" buttons call the `send-reminder` Edge Function, which
logs the nudge and emails the trainer.

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and `supabase link` your project.
2. (For email) create a [Resend](https://resend.com) API key, then:
   ```bash
   supabase secrets set RESEND_API_KEY=re_...        # optional; omit to just log nudges
   supabase secrets set REMINDER_FROM="Symmetry Fitness <you@yourdomain.com>"
   supabase functions deploy send-reminder
   ```
   Without `RESEND_API_KEY` the nudge is still recorded — the email step is simply skipped.
   Swap the Resend call in the function for Twilio/Postmark/push if you prefer.

---

## Project structure

```
src/
  lib/          tokens (colours/fonts), types, derive (show-rate/status/threshold logic), supabase client
  data/         adapter interface + mockAdapter (seed + localStorage) + supabaseAdapter + DataContext
  auth/         AuthContext (Supabase or mock) + LoginScreen
  components/   OwnerDashboard, Desktop/MobileDashboard, DetailDrawer, TrainerView, primitives
  data/seed.ts  the sample data (kept identical to supabase/seed.sql)
supabase/
  migrations/0001_init.sql   tables + RLS policies
  seed.sql                   sample data
  functions/send-reminder/   Edge Function for nudges + email
```

All colours, spacing, and thresholds live in `src/lib/tokens.ts` and `src/lib/derive.ts`,
lifted directly from the design handoff. Change the look in one place.
