import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Flag,
  Landmark,
  Play,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { usePlan } from '../contexts/WorkspaceContext'
import {
  calculate,
  monthName,
  period,
  rupees,
  sum,
  type Month,
  type Page,
} from '../lib/planner'
import { BufferCard, IncomeChart, Sparkline } from '../components/Charts'
import { PageHeader, SectionTitle, Status, TextLink } from '../components/UI'
function PeriodPicker({
  months,
  range,
  onChange,
}: {
  months: Month[]
  range: number
  onChange: (n: number) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const choices = [months, months.slice(0, 6), months.slice(6)]
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  return (
    <div className="period-picker" ref={ref}>
      <button
        className="btn btn-light period-trigger"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <CalendarDays size={15} />
        {period(choices[range])}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="period-menu">
          <span className="eyebrow">DASHBOARD PERIOD</span>
          {choices.map((m, i) => (
            <button
              key={i}
              className={range === i ? 'chosen' : ''}
              onClick={() => {
                onChange(i)
                setOpen(false)
              }}
            >
              <span>
                <strong>
                  {
                    [
                      'Full planning year',
                      'First six months',
                      'Last six months',
                    ][i]
                  }
                </strong>
                <small>{period(m)}</small>
              </span>
              {range === i && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
export function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone,
  values,
  color,
}: {
  label: string
  value: string
  note: string
  icon: LucideIcon
  tone: string
  values?: number[]
  color?: string
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-label">
        <span className={`metric-icon tint-${tone}`}>
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <span>{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-bottom">
        <span>{note}</span>
        {values && <Sparkline values={values} color={color || '#a27dce'} />}
      </div>
    </article>
  )
}
export default function Dashboard({
  navigate,
}: {
  navigate: (p: Page) => void
}) {
  const w = usePlan(),
    [range, setRange] = useState(0),
    full = calculate(w.months, w.rules),
    base = calculate(w.months, w.rules, 10)
  const pick = <T,>(v: T[]) =>
    range === 1 ? v.slice(0, 6) : range === 2 ? v.slice(6) : v
  const rows = pick(full),
    baseline = pick(base),
    balance = rows[rows.length - 1].after,
    loanFree = sum(rows, 'borrowing') === 0,
    avoided = Math.max(0, sum(baseline, 'borrowing') - sum(rows, 'borrowing'))
  const cumulative = (vals: number[]) =>
    vals.map((_, i) => vals.slice(0, i + 1).reduce((a, b) => a + b, 0))
  const first = w.profile.name.split(' ')[0]
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your financial year, at a glance."
      >
        <PeriodPicker months={w.months} range={range} onChange={setRange} />
      </PageHeader>
      <section className="welcome-hero">
        <div
          className="hero-art"
          role="img"
          aria-label="An illustrated lavender mountain landscape with a winding path leading to a summit flag"
        />
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <Sparkles size={13} />
            YOUR FINANCIAL OUTLOOK
          </div>
          <h2>Welcome back, {first}.</h2>
          <p>
            Make your good months work for your lean months.
            <br className="hero-line" /> Your plan for a more secure year starts
            here.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('planner')}
            >
              Open planner
              <ArrowRight size={15} />
            </button>
            <button
              className="hero-secondary"
              onClick={() => navigate('simulation')}
            >
              <Play size={13} />
              Run simulation
            </button>
          </div>
        </div>
      </section>
      <section className="overview-section">
        <SectionTitle
          title={range === 0 ? 'Year at a glance' : 'Period at a glance'}
        >
          <span className={`status-pill ${loanFree ? 'green' : 'amber'}`}>
            <span className="status-dot" />
            {loanFree ? 'Plan on track' : 'Review your plan'}
          </span>
        </SectionTitle>
        <div className="metrics-grid">
          <Metric
            label={range === 0 ? 'Annual income' : 'Period income'}
            value={rupees(sum(rows, 'total'))}
            note="Expected earnings"
            icon={Wallet}
            tone="purple"
            values={cumulative(rows.map((r) => r.total))}
            color="#a481d2"
          />
          <Metric
            label={range === 0 ? 'Annual expenses' : 'Period expenses'}
            value={rupees(sum(rows, 'expenses'))}
            note={`${rupees(sum(rows, 'expenses') / rows.length)} / month`}
            icon={CircleDollarSign}
            tone="peach"
            values={cumulative(rows.map((r) => r.expenses))}
            color="#d6aa70"
          />
          <Metric
            label="Savings buffer"
            value={rupees(balance)}
            note="Projected balance"
            icon={ShieldCheck}
            tone="mint"
            values={rows.map((r) => r.after)}
            color="#6aaa93"
          />
          <Metric
            label="Loans avoided"
            value={rupees(avoided)}
            note="With your plan"
            icon={Landmark}
            tone="blue"
            values={cumulative(
              rows.map((r, i) =>
                Math.max(0, baseline[i].borrowing - r.borrowing),
              ),
            )}
            color="#8e9bc8"
          />
        </div>
      </section>
      <section className="dashboard-charts">
        <IncomeChart rows={rows} />
        <BufferCard
          balance={balance}
          target={w.rules.target}
          onOpen={() => navigate('insights')}
        />
      </section>
      <section className="panel snapshot">
        <div className="panel-title">
          <div>
            <div className="eyebrow muted-eyebrow">
              <CalendarDays size={12} />
              YOUR PLANNING CALENDAR
            </div>
            <h3>Monthly snapshot</h3>
          </div>
          <TextLink onClick={() => navigate('planner')}>
            View all months
          </TextLink>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Closing buffer</th>
                <th>Outlook</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((r) => (
                <tr key={r.month}>
                  <td className="table-month">
                    {monthName(r.month, true, true)}
                  </td>
                  <td>{rupees(r.total)}</td>
                  <td>{rupees(r.expenses)}</td>
                  <td>{rupees(r.after)}</td>
                  <td>
                    <Status lean={r.lean} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="insight-strip">
        <span className="metric-icon tint-purple">
          <Flag size={18} />
        </span>
        <div>
          <b>{full.filter((r) => r.lean).length} lean months in your plan</b>
          <p>See how savings from higher-earning months help cover the gaps.</p>
        </div>
        <button
          className="icon-btn"
          aria-label="View financial insights"
          onClick={() => navigate('insights')}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
    </>
  )
}
