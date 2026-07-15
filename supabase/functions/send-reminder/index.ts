// Supabase Edge Function: send-reminder
// Records a nudge row AND dispatches a real reminder email to the trainer.
//
// Invoked from the app via supabase.functions.invoke('send-reminder',
//   { body: { weekIdx, trainerId } }). Only owners may call it.
//
// Required function env (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   RESEND_API_KEY   — optional; if absent the email step is skipped (nudge still logged)
//   REMINDER_FROM    — optional; sender address, defaults to onboarding@resend.dev
//
// Deploy: supabase functions deploy send-reminder
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const { weekIdx, trainerId } = await req.json()
    if (typeof weekIdx !== 'number' || typeof trainerId !== 'string') {
      return json({ error: 'weekIdx (number) and trainerId (string) are required' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Caller-scoped client — respects RLS, used to confirm the caller is an owner.
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await caller.auth.getUser()
    if (!userData?.user) return json({ error: 'Not authenticated' }, 401)

    const { data: profile } = await caller
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (profile?.role !== 'owner') return json({ error: 'Owner role required' }, 403)

    // Admin client — bypasses RLS to log the nudge and look up the trainer email.
    const admin = createClient(url, service)

    const { data: wk, error: wkErr } = await admin
      .from('weeks')
      .select('id')
      .eq('idx', weekIdx)
      .single()
    if (wkErr || !wk) return json({ error: 'Week not found' }, 404)

    const { error: nudgeErr } = await admin
      .from('nudges')
      .upsert({ trainer_id: trainerId, week_id: wk.id }, { onConflict: 'trainer_id,week_id' })
    if (nudgeErr) return json({ error: nudgeErr.message }, 500)

    // Resolve the trainer's email (from their profile) + display name.
    const { data: trainer } = await admin
      .from('trainers')
      .select('name')
      .eq('id', trainerId)
      .single()
    const { data: tProfile } = await admin
      .from('profiles')
      .select('email, display_name')
      .eq('trainer_id', trainerId)
      .maybeSingle()

    let emailSent = false
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const to = tProfile?.email
    if (resendKey && to) {
      const name = trainer?.name ?? tProfile?.display_name ?? 'there'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('REMINDER_FROM') ?? 'Symmetry Fitness <onboarding@resend.dev>',
          to,
          subject: 'Quick reminder: update your client check-ins',
          html: `<p>Hi ${name},</p><p>Please update your clients' hydration logs and weekly weigh-ins in the Symmetry Fitness dashboard so the studio has an accurate picture of your week.</p><p>Thanks!</p>`,
        }),
      })
      emailSent = res.ok
    }

    return json({ ok: true, nudged: true, emailSent })
  } catch (e: any) {
    return json({ error: e?.message ?? 'Unexpected error' }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
