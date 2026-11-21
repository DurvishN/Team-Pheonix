export type Profile = {
  name: string
  occupation: string
  location: string
  goal: string
  avatar: string
}
export type Rules = {
  savingsRate: number
  monthlyExpenses: number
  startingBuffer: number
  safetyLine: number
  target: number
  stress: number
}
export type Month = {
  month: string
  income: number
  extra: number
  expenses: number
  savings: number | null
  note: string
}
export type Scenario = {
  id: string
  name: string
  saved_at: string
  rules: Rules
  months: Month[]
}
export type Workspace = {
  profile: Profile
  rules: Rules
  months: Month[]
  scenarios: Scenario[]
  revision: number
  updated_at: string
}
export type Row = Month & {
  index: number
  total: number
  surplus: number
  saved: number
  withdrawal: number
  borrowing: number
  before: number
  after: number
  lean: boolean
}
export type Page =
  'dashboard' | 'planner' | 'simulation' | 'insights' | 'settings'
export const rupees = (v: number) =>
  `${v < 0 ? '−' : ''}₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`
export const compact = (v: number) =>
  v >= 100000
    ? `₹${+(v / 100000).toFixed(2)}L`
    : v >= 1000
      ? `₹${+(v / 1000).toFixed(1)}k`
      : rupees(v)
export const monthName = (s: string, full = false, year = false) =>
  new Date(s + '-15T12:00:00Z').toLocaleDateString('en-GB', {
    month: full ? 'long' : 'short',
    ...(year ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  })
export const period = (m: Month[]) =>
  m.length
    ? `${monthName(m[0].month, false, true)} – ${monthName(m[m.length - 1].month, false, true)}`
    : ''
export const sum = (
  rows: Row[],
  key: 'total' | 'expenses' | 'saved' | 'borrowing' | 'withdrawal' | 'surplus',
) => rows.reduce((s, r) => s + r[key], 0)
export function calculate(
  months: Month[],
  rules: Rules,
  rate?: number,
  reduction = 0,
): Row[] {
  let balance = rules.startingBuffer
  return months.map((m, index) => {
    const total = Math.round((m.income + m.extra) * (1 - reduction / 100))
    const surplus = total - m.expenses,
      before = balance
    const saved = Math.max(
      0,
      Math.min(
        Math.max(surplus, 0),
        rate === undefined && m.savings !== null
          ? m.savings
          : Math.round(
              (Math.max(0, surplus) * (rate ?? rules.savingsRate)) / 100,
            ),
      ),
    )
    const withdrawal = Math.max(0, Math.min(before, -surplus)),
      borrowing = Math.max(0, -surplus - withdrawal)
    balance = before + saved - withdrawal
    return {
      ...m,
      index,
      total,
      surplus,
      before,
      saved,
      withdrawal,
      borrowing,
      after: balance,
      lean: surplus < 0,
    }
  })
}
export const recommendation = (r: Row, target: number) =>
  r.borrowing
    ? `Your buffer covers ${rupees(r.withdrawal)} of the gap. Plan for the remaining ${rupees(r.borrowing)} shortfall.`
    : r.lean
      ? `Use ${rupees(r.withdrawal)} from your buffer to cover this month's income gap.`
      : r.after >= target
        ? `Your ${rupees(target)} target is funded. Keep ${rupees(r.saved)} set aside for the quieter months.`
        : `Set aside ${rupees(r.saved)} from your ${rupees(r.surplus)} surplus to grow your buffer.`
export function requiredBuffer(rows: Row[]) {
  let need = 0,
    run = 0
  for (const r of rows) {
    run = r.lean ? run - r.surplus : 0
    need = Math.max(need, run)
  }
  return need
}
export function downloadPlan(w: Workspace, csv = false) {
  const rows = calculate(w.months, w.rules)
  const value = csv
    ? 'Month,Income,Additional income,Expenses,Surplus,Saved,Withdrawn,Closing buffer,Borrowing\r\n' +
      rows
        .map((r) =>
          [
            r.month,
            r.income,
            r.extra,
            r.expenses,
            r.surplus,
            r.saved,
            r.withdrawal,
            r.after,
            r.borrowing,
          ].join(','),
        )
        .join('\r\n')
    : JSON.stringify(
        {
          application: 'LeanMonth Planner',
          exported_at: new Date().toISOString(),
          ...w,
        },
        null,
        2,
      )
  const url = URL.createObjectURL(
    new Blob([value], {
      type: csv ? 'text/csv;charset=utf-8;' : 'application/json',
    }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `LeanMonth-${w.profile.name.replace(/[^a-z0-9-]/gi, '-')}-plan.${csv ? 'csv' : 'json'}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
