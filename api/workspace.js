import supabase from './db-client.js'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import { sealFields, openFields } from '../server/private-fields.js'

const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status })
const text = (value, max = 160) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''
function number(value, label, max = 100000000, min = 0) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw fail(`Enter a valid ${label} between ${min} and ${max}.`)
  return Math.round(value)
}
async function identity(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Guest ') && /^[a-f0-9]{64}$/.test(auth.slice(6))) {
    return {
      id: 'g_' + createHash('sha256').update(auth.slice(6)).digest('hex'),
      user: null,
      db: supabase,
    }
  }
  if (!auth.startsWith('Bearer '))
    throw fail('Please open your workspace again.', 401)
  const token = auth.slice(7)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error || !user)
    throw fail('Your session has expired. Please sign in again.', 401)
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
  return { id: 'u_' + user.id, user, db }
}
const visible = (w) => ({
  profile: w.profile,
  months: w.months,
  rules: w.rules,
  scenarios: w.scenarios,
  revision: w.revision,
  updated_at: w.updated_at,
})
async function template() {
  const { data, error } = await supabase
    .from('lm_templates')
    .select('*')
    .eq('id', 'ravi')
    .single()
  if (error) throw error
  return data
}
function rulesFrom(r) {
  return {
    savingsRate: number(r.savingsRate, 'savings rate', 100),
    monthlyExpenses: number(r.monthlyExpenses, 'monthly expense'),
    startingBuffer: number(r.startingBuffer, 'starting balance'),
    safetyLine: number(r.safetyLine, 'safety line'),
    target: number(r.target, 'buffer target', 100000000, 1),
    stress: number(r.stress, 'stress reduction', 100),
  }
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  )
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    if (!['GET', 'PUT', 'POST', 'DELETE'].includes(req.method))
      return res.status(405).json({ error: 'Method not allowed' })
    const { id, user, db } = await identity(req)
    const found = await db
      .from('lm_workspaces')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (found.error) throw found.error
    let w = found.data
    if (!w) {
      const t = await template()
      const profile = user
        ? {
            name: text(
              user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                'Planner',
              50,
            ),
            location: '',
            occupation: '',
            goal: '',
            avatar: 'violet',
          }
        : t.profile
      const made = await db
        .from('lm_workspaces')
        .upsert(
          {
            id,
            user_id: user?.id || null,
            ...sealFields({ profile, rules: t.rules, months: t.months, scenarios: [] }, id),
            revision: 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: true },
        )
        .select('*')
        .maybeSingle()
      if (made.error) throw made.error
      w = made.data
      if (!w) {
        const again = await db
          .from('lm_workspaces')
          .select('*')
          .eq('id', id)
          .single()
        if (again.error) throw again.error
        w = again.data
      }
    }
    w = openFields(w, id)
    if (req.method === 'GET') return res.status(200).json(visible(w))
    const b = req.body || {}
    if (b.revision !== w.revision)
      throw fail(
        'Your plan changed in another tab. We refreshed it; please review and save again.',
        409,
      )
    const patch = {
      updated_at: new Date().toISOString(),
      revision: w.revision + 1,
    }
    if (req.method === 'POST' && b.area === 'scenario') {
      if (w.scenarios.length >= 20)
        throw fail(
          'You can keep 20 scenarios. Remove one before saving another.',
        )
      const name = text(b.name, 60)
      if (!name) throw fail('Give your scenario a name.')
      const rules = { ...w.rules }
      let months = w.months
      if (b.rate !== undefined) {
        rules.savingsRate = number(b.rate, 'savings rate', 100)
        months = months.map((m) => ({ ...m, savings: null }))
      }
      patch.scenarios = [
        ...w.scenarios,
        { id: randomUUID(), name, saved_at: patch.updated_at, rules, months },
      ]
    } else if (req.method === 'DELETE' && b.area === 'scenario') {
      if (!w.scenarios.some((s) => s.id === b.id))
        throw fail('This scenario was not found.', 404)
      patch.scenarios = w.scenarios.filter((s) => s.id !== b.id)
    } else if (req.method === 'PUT') {
      if (b.area === 'profile') {
        const p = b.profile || {}
        const name = text(p.name, 50)
        if (!name) throw fail('Please enter your name.')
        patch.profile = {
          name,
          location: text(p.location, 80),
          occupation: text(p.occupation, 80),
          goal: text(p.goal, 500),
          avatar: ['violet', 'mint', 'peach', 'blue', 'rose'].includes(p.avatar)
            ? p.avatar
            : 'violet',
        }
      } else if (b.area === 'month') {
        if (
          !Number.isInteger(b.index) ||
          b.index < 0 ||
          b.index >= w.months.length
        )
          throw fail('Choose a month in your plan.')
        const m = b.month || {}
        const income = number(m.income, 'income')
        const extra = number(m.extra, 'additional income')
        const expenses = number(m.expenses, 'expense amount')
        const savings =
          m.savings == null
            ? null
            : number(
                m.savings,
                'savings contribution',
                Math.max(0, income + extra - expenses),
              )
        patch.months = w.months.map((old, i) =>
          i === b.index
            ? {
                month: old.month,
                income,
                extra,
                expenses,
                savings,
                note: text(m.note, 1000),
              }
            : old,
        )
      } else if (b.area === 'rules') {
        patch.rules = rulesFrom(b.rules || {})
        patch.months = w.months.map((m) => ({
          ...m,
          expenses:
            m.expenses === w.rules.monthlyExpenses
              ? patch.rules.monthlyExpenses
              : m.expenses,
          savings: null,
        }))
      } else if (b.area === 'stress') {
        patch.rules = {
          ...w.rules,
          stress: number(b.stress, 'stress reduction', 100),
        }
      } else if (b.area === 'sync') {
        patch.months = w.months.map((m) => ({ ...m, savings: null }))
      } else if (b.area === 'load-scenario') {
        const s = w.scenarios.find((s) => s.id === b.id)
        if (!s) throw fail('Scenario not found.', 404)
        patch.rules = s.rules
        patch.months = s.months
      } else if (b.area === 'reset') {
        const t = await template()
        patch.rules = t.rules
        patch.months = t.months
      } else throw fail('Unknown planner action.')
    } else throw fail('Unknown planner action.')
    const { data, error } = await db
      .from('lm_workspaces')
      .update(sealFields(patch, id))
      .eq('id', id)
      .eq('revision', w.revision)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (!data)
      throw fail(
        'Another tab saved changes. Please review the refreshed plan.',
        409,
      )
    return res.status(req.method === 'POST' ? 201 : 200).json(visible(openFields(data, id)))
  } catch (err) {
    console.error(
      'Workspace request:',
      err.code || err.status || 'database error',
    )
    return res
      .status(err.status || 500)
      .json({
        error: err.status
          ? err.message
          : 'Your workspace is temporarily unavailable. Please try again in a moment.',
      })
  }
}
